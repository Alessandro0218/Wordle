import uuid
from enum import Enum

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


class Guess:
    def __init__(self, guess: str, result: dict):
        self.guess = guess
        self.result = result

    def to_dict(self):
        return {
            "word": self.guess,
            "status": self.result,
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
            raise ValueError("Invalid word guess")

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
