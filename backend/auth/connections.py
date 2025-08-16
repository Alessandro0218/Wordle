from typing import Dict

from fastapi import WebSocket
from starlette.authentication import AuthCredentials, AuthenticationBackend

from backend.auth.domain import AuthenticatedUser
from backend.auth.jwt import verify_jwt_token
from backend.auth.service import get_user_data_from_token


class JWTAuthBackend(AuthenticationBackend):
    async def authenticate(self, conn):
        token = conn.cookies.get("user_token")
        if not token:
            return None

        try:
            verify_jwt_token(token)
            user_data = get_user_data_from_token(token)
        except Exception:
            return None

        return AuthCredentials(["authenticated"]), AuthenticatedUser(user_data)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, list[WebSocket]] = {}  # key = game_id

    async def connect(self, game_id: str, websocket: WebSocket):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = []
        self.active_connections[game_id].append(websocket)

    def get_connections(self, game_id: str) -> list[WebSocket]:
        return self.active_connections.get(game_id, [])

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.active_connections:
            self.active_connections[game_id] = [
                conn for conn in self.active_connections[game_id]
                if conn != websocket
            ]
            if not self.active_connections[game_id]:
                self.active_connections.pop(game_id)
