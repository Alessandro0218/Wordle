import asyncio
import time

from auth.domain import GameErrorType, User
from auth.service import get_user_data_from_token
from game.engine import GameEngine, VersusGame, VersusGameStatus
from pyee.asyncio import AsyncIOEventEmitter

events = AsyncIOEventEmitter()


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

        asyncio.create_task(self._monitor_inactivity())

    async def _monitor_inactivity(self):
        while True:
            if not self.sessions:
                await asyncio.sleep(5)
                continue
            await asyncio.sleep(1)
            for session in list(self.sessions.values()):
                if all(not p.online for p in session.players):
                    if session.status == VersusGameStatus.FINISHED:
                        self.remove_session(session.game_id, False)
                    elif time.time() - session._last_active > session.MAX_INACTIVITY_TIME:
                        session.mark_as_ended()
                else:
                    session._touch()

            events.emit("session_updated", self.list_sessions())

    def create_session(self, owner: User, name: str, max_players: int):
        session = VersusGame(owner, name, max_players)
        self.sessions[session.game_id] = session
        events.emit("session_updated", self.list_sessions())
        return session.get_status(owner)

    def start_session(self, user: User, game_id: str):
        session = self.sessions.get(game_id)
        if not session:
            raise ValueError(GameErrorType.SESSION_NOT_FOUND)
        if session.owner == user:
            events.emit("game_updated", self.list_sessions())
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
                events.emit("session_updated", self.list_sessions())
        except Exception as e:
            raise e

    def make_guess(self, user: User, game_id: str, guess: str):
        session = self.sessions.get(game_id)
        if not session:
            raise ValueError(GameErrorType.SESSION_NOT_FOUND)
        result = session.make_guess(user, guess)
        events.emit("game_updated", self.list_sessions())
        return result

    def get_session(self, game_id: str) -> VersusGame | None:
        return self.sessions.get(game_id)

    def remove_session(self, game_id: str, returnValue: bool = True) -> VersusGame | None:
        session = self.sessions.pop(game_id, None)
        if session:
            events.emit("game_updated", self.list_sessions())
        if returnValue:
            return session

    def list_sessions(self):
        return list(self.sessions)

    def set_player_offline(self, user: User, game_id):
        session = self.sessions.get(game_id)
        if not session:
            return
        session.set_player_offline(user)
        events.emit("game_updated", self.list_sessions())

    def set_player_online(self, user: User, game_id):
        session = self.sessions.get(game_id)
        if not session:
            return
        session.set_player_online(user)
        events.emit("game_updated", self.list_sessions())

    def toggle_player_ready(self, user: User, game_id):
        session = self.sessions.get(game_id)
        if not session:
            return
        session.toggle_player_ready(user)
        events.emit("game_updated", self.list_sessions())

    def set_player_unready(self, user: User, game_id):
        session = self.sessions.get(game_id)
        if not session:
            return
        session.set_player_unready(user)
        events.emit("game_updated", self.list_sessions())
