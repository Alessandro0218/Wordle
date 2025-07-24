from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.auth.connections import ConnectionManager
from backend.auth.domain import GameErrorType
from backend.auth.routes import router
from backend.game.session import GameManager

""" dotenv_path = os.path.join(os.path.dirname(__file__), "env", ".env")
load_dotenv(dotenv_path=dotenv_path) """
app = FastAPI()
gameManager = GameManager()
connectionManager = ConnectionManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/auth")


@app.websocket("/wordle/{game_id}")
async def websocket_endpoint(websocket: WebSocket):
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


@app.get("/")
def read_root():
    return health_check()


@app.post("/start")
def start():
    session = gameManager.create_session()
    return session


@app.post("/guess")
def make_guess(request: dict):
    game_id = request.get("game_id")
    guess = request.get("guess")

    if not game_id or not guess:
        return JSONResponse(status_code=400, content={"error": "game_id and guess are required"})

    session = gameManager.get_session(game_id)
    if not session:
        return JSONResponse(status_code=404, content={"error": "Game not found"})
    try:
        result = session.make_guess(guess)
        if result:
            return JSONResponse(status_code=200, content=session.get_status())
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.get("/status/{game_id}")
def get_status(game_id: str):
    session = gameManager.get_session(game_id)
    if not session:
        return JSONResponse(status_code=404, content={"error": "Game not found"})
    return JSONResponse(status_code=200, content=session.get_status())


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
