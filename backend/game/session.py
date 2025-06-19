from backend.game.engine import GameEngine


class GameManager:
    def __init__(self):
        self.sessions = {}

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
