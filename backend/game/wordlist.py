from enum import Enum
from random import choice


class WordStatus(Enum):
    CORRECT = 1
    PRESENT = 2
    ABSENT = 3
    INCORRECT_LENGTH = 4


def get_random_word(file_path: str = "data/words.txt") -> str:
    with open(file_path, "r") as f:
        words = [line.strip() for line in f if line.strip()]
    return choice(words)


def is_valid_word(word: str, file_path: str = "data/words.txt") -> bool:
    with open(file_path, "r") as f:
        words = {line.strip() for line in f if line.strip()}
    return word in words


def evaluate_guess(guess: str, word: str) -> dict:
    if len(guess) != len(word):
        raise ValueError("Guess length does not match the word length")

    result = {}
    for i, char in enumerate(guess):
        if char == word[i]:
            result[i] = WordStatus.CORRECT.value
        elif char in word:
            result[i] = WordStatus.PRESENT.value
        else:
            result[i] = WordStatus.ABSENT.value

    return result
