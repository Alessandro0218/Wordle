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

    def create_session(self, same_word=True):
        session = VersusGame(players, same_word=same_word)
        self.sessions[session.game_id] = session
        return session.get_status()

    def get_session(self, game_id: str) -> VersusGame | None:
        return self.sessions.get(game_id)

    def remove_session(self, game_id: str) -> VersusGame | None:
        return self.sessions.pop(game_id, None)

    def list_sessions(self):
        return list(self.sessions.keys())
