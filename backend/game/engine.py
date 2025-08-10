import uuid
from enum import Enum

from backend.auth.domain import GameErrorType
from backend.game.wordlist import (
    WordStatus,
    evaluate_guess,
    get_random_word,
    is_valid_word,
)


class GameStatus(Enum):
    IN_PROGRESS = 1
    WON = 2
    LOST = 3


class VersusGameStatus(Enum):
    CREATED = 0
    IN_PROGRESS = 1
    FINISHED = 2


class Guess:
    def __init__(self, guess: str, result: dict):
        self.guess = guess
        self.result = result

    def to_dict(self):
        return {
            "word": self.guess,
            "status": self.result,
        }


class VersusGame:
    def __init__(self):
        self.game_id = str(uuid.uuid4())
        self.status = VersusGameStatus.CREATED
        self.players = {}
        self.winner = None
        self.word = get_random_word()

    def add_player(self, player_name: str):
        if player_name in self.players:
            raise ValueError("Player already exists")

        self.players[player_name] = GameEngine()
        if len(self.players) == 2:
            self.status = VersusGameStatus.IN_PROGRESS

    def make_guess(self, player: str, guess: str):
        if self.status != VersusGameStatus.IN_PROGRESS:
            raise ValueError("Game already finished")

        if player not in self.players:
            raise ValueError("Invalid player")

        result = self.players[player].make_guess(guess)

        if self.players[player].status == GameStatus.WON:
            self.status = VersusGameStatus.FINISHED
            self.winner = player

        elif all(p.status != GameStatus.IN_PROGRESS for p in self.players.values()):
            self.status = VersusGameStatus.FINISHED

        return result

    def get_status(self):
        return {
            "game_id": self.game_id,
            "status": self.status.value,
            "winner": self.winner,
            "players": {name: engine.get_status() for name, engine in self.players.items()},
        }


class GameEngine:
    games = []

    def __init__(self):
        self.game_id = str(uuid.uuid4())
        self.word = get_random_word()
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

    def get_status(self):
        return {
            "game_id": self.game_id,
            "word": self.word,
            "guesses": [guess.to_dict() for guess in self.guesses],
            "max_guess": self.max_guesses,
            "status": self.status.value,
            "current_guess": self.current_guess,
            "word_length": self.word_length,
        }
