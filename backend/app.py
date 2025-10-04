from auth.connections import ConnectionManager, JWTAuthBackend
from auth.domain import GameErrorType, User
from auth.jwt import create_jwt_token, verify_jwt_token
from auth.routes import router
from auth.service import get_user_data_from_token
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from game.engine import CreateRoomRequest, EnterRoomRequest
from game.session import SingleManager, VersusManager, events
from starlette.middleware.authentication import AuthenticationMiddleware

app = FastAPI()
gameManager = SingleManager()
versusManager = VersusManager()
connectionManager = ConnectionManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/auth")


app.add_middleware(AuthenticationMiddleware, backend=JWTAuthBackend())


@app.get("/")
def read_root():
    return health_check()


# Multi Player


@events.on("session_updated")
async def handle_list_update(sessions: list[str]):
    try:
        for conn in connectionManager.get_connections("guest"):
            await conn.send_json(
                {
                    "action": "list",
                    "data": [
                        session.get_status(conn.user.user_model)
                        for x in sessions
                        if (session := versusManager.get_session(x)) is not None
                    ],
                }
            )
    except Exception:
        # events.remove_listener("session_updated", handle_list_update)
        pass


@events.on("game_updated")
async def handle_game_update(sessions: list[str]):
    try:
        for game_id in sessions:
            session = versusManager.get_session(game_id)
            if not session:
                continue
            for conn in connectionManager.get_connections(game_id):
                await conn.send_json({"action": "status", **session.get_status(conn.user.user_model)})
    except Exception:
        # events.remove_listener("game_updated", handle_game_update)
        pass


@app.websocket("/versus/list")
async def list_versus_games(websocket: WebSocket):
    def get_sessions():
        sessions = []
        for x in versusManager.list_sessions():
            session = versusManager.get_session(x)
            if session is not None:
                sessions.append(session.get_status(websocket.user.user_model))
        return sessions

    await connectionManager.connect("guest", websocket)
    await websocket.send_json({"action": "list", "data": get_sessions()})

    try:
        await websocket.receive_text()
    except WebSocketDisconnect:
        connectionManager.disconnect("guest", websocket)


@app.websocket("/versus/{game_id}")
async def versus_socket(websocket: WebSocket):
    game_id = str(websocket.path_params.get("game_id"))
    token = str(websocket.cookies.get("user_token", None))
    await connectionManager.connect(game_id, websocket)

    try:
        verify_jwt_token(token)
        user = get_user_data_from_token(token)
    except Exception as e:
        await websocket.send_json({"action": "error", "error": str(e)})
        await websocket.close()
        return

    session = versusManager.get_session(game_id)
    if not session:
        await websocket.send_json({"action": "error", "error": GameErrorType.SESSION_NOT_FOUND})
        await websocket.close()
        return

    try:
        versusManager.join_session(token, game_id)
    except ValueError as e:
        if e.args[0] == GameErrorType.PLAYER_ALREADY_EXISTS:
            pass
    except Exception as e:
        await websocket.send_json({"action": "error", "error": str(e)})
        await websocket.close()
        return

    versusManager.set_player_online(user, game_id)

    await websocket.send_json({"action": "status", **session.get_status(user)})

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            payload = data.get("data", {})

            if action == "start":
                try:
                    versusManager.start_session(user, game_id)
                except Exception as e:
                    await websocket.send_json({"action": "error", "error": str(e)})
                    return

            elif action == "guess":
                try:
                    versusManager.make_guess(user, game_id, payload.get("guess"))
                    await websocket.send_json({"action": "guess", **session.get_status(user)})
                    for conn in connectionManager.get_connections(game_id):
                        if conn != websocket:
                            await conn.send_json({"action": "status", **session.get_status(conn.user.user_model)})
                except ValueError as e:
                    if e.args[0] == GameErrorType.INVALID_WORD:
                        await websocket.send_json({"action": "error", "error": str(e)})
                        continue
                    await websocket.send_json({"action": "error", "error": str(e)})
                    await websocket.close()
                    return

            elif action == "status":
                await websocket.send_json({"action": "status", **session.get_status(user)})

            elif action == "toggle_ready":
                versusManager.toggle_player_ready(user, game_id)
                for conn in connectionManager.get_connections(game_id):
                    await conn.send_json({"action": "status", **session.get_status(conn.user.user_model)})
            elif action == "give_up":
                session.give_up(user)
                for conn in connectionManager.get_connections(game_id):
                    await conn.send_json({"action": "status", **session.get_status(conn.user.user_model)})
            else:
                await websocket.send_json({"action": "error", "message": f"Unknown action: {action}"})

    except WebSocketDisconnect:
        versusManager.set_player_offline(user, game_id)
        versusManager.set_player_unready(user, game_id)
        connectionManager.disconnect(game_id, websocket)


@app.post("/versus/create")
async def create_room(request: Request, room: CreateRoomRequest):
    token = str(request.cookies.get("user_token", None))
    try:
        verify_jwt_token(token)
        user = get_user_data_from_token(token)
    except Exception as e:
        return JSONResponse(status_code=401, content={"error": str(e)})
    session = versusManager.create_session(user, room.name, room.max_players)
    # session = versusManager.start_session(user, session["game_id"])  # ONLY DEBUG
    return session


@app.post("/versus/start")
def start_game(request: Request, game_id: str):
    token = str(request.cookies.get("user_token", None))
    try:
        verify_jwt_token(token)
        user = get_user_data_from_token(token)
    except Exception as e:
        return JSONResponse(status_code=401, content={"error": str(e)})
    try:
        session = versusManager.start_session(user, game_id)
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    return session


@app.post("/versus/join")
async def join_game(request: Request, arg: EnterRoomRequest):
    token = str(request.cookies.get("user_token", None))
    code = arg.code
    try:
        verify_jwt_token(token)
        user = get_user_data_from_token(token)
    except Exception as e:
        return JSONResponse(status_code=401, content={"error": str(e)})

    if len(code) != 5:
        return JSONResponse(status_code=400, content={"error": "Invalid game ID format"})

    try:
        sessions = versusManager.list_sessions()
        if len(sessions) == 0:
            raise ValueError(GameErrorType.SESSION_NOT_FOUND)

        game_id = next(session for session in sessions if code in session)
        if not game_id:
            raise ValueError(GameErrorType.SESSION_NOT_FOUND)

        session = versusManager.get_session(game_id)
        if not session:
            raise ValueError(GameErrorType.SESSION_NOT_FOUND)
        return session.get_status(user)
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


# Single Player


@app.websocket("/wordle/{game_id}")
async def wordle_socket(websocket: WebSocket):
    game_id = str(websocket.path_params.get("game_id"))
    await connectionManager.connect(game_id, websocket)

    session = gameManager.get_session(game_id)
    if session:
        await websocket.send_json({"action": "status", **session.get_status()})
    else:
        await websocket.send_json({"action": "error", "error": GameErrorType.SESSION_NOT_FOUND})
        await websocket.close()
        return

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            payload = data.get("data", {})

            session = gameManager.get_session(game_id)

            if not session:
                await websocket.send_json({"action": "error", "message": "Session not found"})
                continue

            if action == "guess":
                try:
                    session.make_guess(payload.get("guess"))
                    await websocket.send_json({"action": "guess", **session.get_status()})
                except ValueError as e:
                    await websocket.send_json({"action": "error", "error": str(e)})

            elif action == "status":
                await websocket.send_json({"action": "status", **session.get_status()})

            elif action == "end":
                gameManager.remove_session(game_id)
                await websocket.send_json({"action": "end", "message": "Game ended"})
                break

            else:
                await websocket.send_json({"action": "error", "message": f"Unknown action: {action}"})

    except WebSocketDisconnect:
        connectionManager.disconnect(game_id, websocket)
        if not connectionManager.get_connections(game_id):
            versusManager.remove_session(game_id)


@app.post("/start")
def start():
    session = gameManager.create_session()
    return session


@app.get("/list")
def list_sessions():
    return JSONResponse(status_code=200, content=gameManager.list_sessions())


@app.delete("/remove/{game_id}")
def remove_session(game_id: str):
    session = gameManager.remove_session(game_id)
    if not session:
        return JSONResponse(status_code=404, content={"error": "Game not found"})
    return JSONResponse(status_code=200, content={"message": f"Session {session.game_id} removed successfully"})


@app.delete("/remove_all")
def remove_all_sessions():
    gameManager.sessions.clear()
    return JSONResponse(status_code=200, content={"message": "All sessions removed successfully"})


@app.get("/health")
def health_check():
    return JSONResponse(status_code=200, content={"status": "ok", "message": "Server is running"})


# Debug


@app.post("/token")
def create_token(user: User):
    token = create_jwt_token(
        {
            "user_id": user.id,
            "discord_username": user.discord_username,
            "discord_avatar": user.discord_avatar,
        }
    )
    return {"token": token}
