import time
import uuid
from enum import Enum

from auth.domain import GameErrorType, User
from game.wordlist import WordStatus, evaluate_guess, get_random_word, is_valid_word
from pydantic import BaseModel


class GameStatus(Enum):
    IN_PROGRESS = 1
    WON = 2
    LOST = 3


class VersusGameStatus(Enum):
    CREATED = 0
    IN_PROGRESS = 1
    FINISHED = 2


class PlayerState:
    def __init__(self, player: User, defined_word: str | None = None):
        self._player = player
        self._ready: bool = False
        self._online: bool = False
        self._game: GameEngine = GameEngine(defined_word)

    @property
    def player(self):
        return self._player

    @property
    def ready(self):
        return self._ready

    @ready.setter
    def ready(self, state: bool):
        self._ready = state

    @property
    def online(self):
        return self._online

    @online.setter
    def online(self, state: bool):
        self._online = state

    @property
    def game(self):
        return self._game

    @game.setter
    def game(self, game):
        self._game = game

    def to_json(self, public: bool = False):
        return {
            "player": self.player.model_dump(),
            "ready": self.ready,
            "online": self.online,
            "game": self.game.get_status(public=public),
        }


class Guess:
    def __init__(self, guess: str, result: dict):
        self.guess = guess
        self.result = result

    def to_dict(self):
        return {
            "word": self.guess,
            "status": self.result,
        }

    def to_dict_public(self):
        return {
            "word": "".join(["     " for _ in self.guess]),
            "status": self.result,
        }


class CreateRoomRequest(BaseModel):
    name: str
    max_players: int


class EnterRoomRequest(BaseModel):
    code: str


class VersusGame:
    def __init__(self, owner: User, name: str, max_player: int = 4):
        self.game_id: str = str(uuid.uuid4())
        self.name: str = name
        self.status: VersusGameStatus = VersusGameStatus.CREATED
        self.players: list[PlayerState] = []
        self.winner: User | None = None
        self.owner: User = owner
        self.word: str = get_random_word()
        self.max_players: int = max_player
        self.MAX_INACTIVITY_TIME = 600
        self._last_active = time.time()

    def _touch(self):
        self._last_active = time.time()

    def mark_as_ended(self):
        self.status = VersusGameStatus.FINISHED

    def start(self, user: User):
        self.status = VersusGameStatus.IN_PROGRESS
        return self.get_status(user)

    def add_player(self, player: User):
        if player.discord_id in [p.player.discord_id for p in self.players]:
            raise ValueError(GameErrorType.PLAYER_ALREADY_EXISTS)

        self.players.append(PlayerState(player, self.word))

    def make_guess(self, player: User, guess: str):
        if player.discord_id not in [p.player.discord_id for p in self.players]:
            raise ValueError(GameErrorType.INVALID_PLAYER)

        player_game = next(filter(lambda user: user.player.discord_id == player.discord_id, self.players))
        result = player_game.game.make_guess(guess)

        if player_game.game.status == GameStatus.WON:
            self.status = VersusGameStatus.FINISHED
            self.winner = player

        return result

    def get_status(self, user: User):
        return {
            "game_id": self.game_id,
            "name": self.name,
            "status": self.status.value,
            "winner": self.winner.to_json() if self.winner else None,
            "players": [
                player_state.to_json(public=player_state.player.discord_id != user.discord_id)
                for player_state in self.players
            ],
            "word": self.word if self.has_user_ended(user) else "",
            "max_players": self.max_players,
            "owner": self.owner.to_json(),
            "time_remaining": int(self.MAX_INACTIVITY_TIME - (time.time() - self._last_active)),
        }

    def set_player_offline(self, user: User):
        for player_state in self.players:
            if player_state.player.discord_id == user.discord_id:
                player_state.online = False
                break

    def set_player_online(self, user: User):
        for player_state in self.players:
            if player_state.player.discord_id == user.discord_id:
                player_state.online = True
                break

    def toggle_player_ready(self, user: User):
        for player_state in self.players:
            if player_state.player.discord_id == user.discord_id:
                player_state.ready = not player_state.ready
                break

    def set_player_unready(self, user: User):
        for player_state in self.players:
            if player_state.player.discord_id == user.discord_id:
                player_state.ready = False
                break

    def has_user_ended(self, user: User) -> bool:
        for player_state in self.players:
            if player_state.player.discord_id == user.discord_id:
                if player_state.game.status in [GameStatus.WON, GameStatus.LOST]:
                    return True
        return False


class GameEngine:
    games = []

    def __init__(self, defined_word: str | None = None):
        self.game_id = str(uuid.uuid4())
        self.word = defined_word if defined_word else get_random_word()
        self.guesses = []
        self.status = GameStatus.IN_PROGRESS
        self.max_guesses = 6
        self.current_guess = 0
        self.word_length = len(self.word)

    def make_guess(self, guess: str):
        if self.status != GameStatus.IN_PROGRESS:
            raise ValueError("Game is not ongoing")

        if not is_valid_word(guess):
            raise ValueError(GameErrorType.INVALID_WORD)

        result = evaluate_guess(guess, self.word)
        self.guesses.append(Guess(guess, result))
        self.current_guess += 1

        if result == {i: WordStatus.CORRECT.value for i in range(len(self.word))}:
            self.status = GameStatus.WON
        elif len(self.guesses) >= self.max_guesses:
            self.status = GameStatus.LOST

        return result

    def get_status(self, public: bool = False):
        return {
            "game_id": self.game_id,
            # "word": self.word, # DEBUG ONLY
            "guesses": [guess.to_dict_public() if public else guess.to_dict() for guess in self.guesses],
            "max_guess": self.max_guesses,
            "status": self.status.value,
            "current_guess": self.current_guess,
            "word_length": self.word_length,
        }
