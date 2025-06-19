from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.game.session import GameManager

app = FastAPI()
gameManager = GameManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
