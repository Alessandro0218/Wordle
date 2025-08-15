from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.auth.connections import ConnectionManager
from backend.auth.domain import GameErrorType
from backend.auth.jwt import verify_jwt_token
from backend.auth.routes import router
from backend.auth.service import get_user_data_from_token
from backend.game.session import SingleManager, VersusManager

""" dotenv_path = os.path.join(os.path.dirname(__file__), "env", ".env")
load_dotenv(dotenv_path=dotenv_path) """
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


@app.get("/")
def read_root():
    return health_check()


# Multi Player


@app.websocket("/versus/{game_id}")
async def versus_socket(websocket: WebSocket):
    game_id = str(websocket.path_params.get("game_id"))
    token = str(websocket.cookies.get("user_token", None))
    await connectionManager.connect(game_id, websocket)

    try:
        verify_jwt_token(token)
    except Exception as e:
        await websocket.send_json({"action": "error", "error": str(e)})
        await websocket.close()
        return

    session = versusManager.get_session(game_id)
    if session:
        await websocket.send_json({"action": "status", **session.get_status()})
    else:
        await websocket.send_json({"action": "error", "error": GameErrorType.SESSION_NOT_FOUND})
        await websocket.close()
        return

    try:
        versusManager.join_session(token, game_id)
    except Exception as e:
        await websocket.send_json({"action": "error", "error": str(e)})
        await websocket.close()
        return

    await websocket.send_json({"action": "status", **session.get_status()})

    try:
        while True:
            data = await websocket.receive_json()
            print(data)

    except WebSocketDisconnect:
        connectionManager.disconnect(game_id)


@app.post("/versus/create")
def create_room(request: Request):
    token = str(request.cookies.get("user_token", None))
    try:
        verify_jwt_token(token)
        user = get_user_data_from_token(token)
    except Exception as e:
        print(f"Error verifying token: {e}")
        return JSONResponse(status_code=401, content={"error": "Invalid token"})
    session = versusManager.create_session(user)
    return session


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
        connectionManager.disconnect(game_id)


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
