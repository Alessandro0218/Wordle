from backend.auth.domain import GameErrorType, User
from backend.auth.service import get_user_data_from_token
from backend.game.engine import GameEngine, VersusGame


class SingleManager:
    def __init__(self):
        self.sessions: dict[str, GameEngine] = {}

    def create_session(self):
        session = GameEngine()
        self.sessions[session.game_id] = session
        return session.get_status()

    def get_session(self, game_id: str) -> GameEngine | None:
        return self.sessions.get(game_id)

    def remove_session(self, game_id: str) -> GameEngine | None:
        if game_id in self.sessions:
            session = self.sessions[game_id]
            del self.sessions[game_id]
            return session

    def list_sessions(self):
        return list(self.sessions.keys())


class VersusManager:
    def __init__(self):
        self.sessions: dict[str, VersusGame] = {}

    def create_session(self, owner: User):
        session = VersusGame(owner)
        self.sessions[session.game_id] = session
        return session.get_status(owner)

    def start_session(self, user: User, game_id: str):
        session = self.sessions.get(game_id)
        if not session:
            raise ValueError(GameErrorType.SESSION_NOT_FOUND)
        if session.owner == user:
            return session.start(user)
        else:
            raise ValueError(GameErrorType.NOT_SESSION_OWNER)

    def join_session(self, user_token: str, game_id: str):
        session = self.sessions.get(game_id)
        if not session:
            return
        try:
            user = get_user_data_from_token(user_token)
            if user:
                session.add_player(user)
        except Exception as e:
            raise e

    def get_session(self, game_id: str) -> VersusGame | None:
        return self.sessions.get(game_id)

    def remove_session(self, game_id: str) -> VersusGame | None:
        return self.sessions.pop(game_id, None)

    def list_sessions(self):
        return list(self.sessions.keys())
