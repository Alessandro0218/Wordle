import json
from enum import IntEnum

from pydantic import BaseModel


class User(BaseModel):
    id: int
    discord_id: str
    discord_username: str
    discord_avatar: str

    @classmethod
    def from_json(cls, json_str: str):
        return cls(**json.loads(json_str))

    def to_json(self) -> str:
        return self.model_dump_json()


class GameErrorType(IntEnum):
    GENERAL_ERROR = 0
    SESSION_NOT_FOUND = 1
    INVALID_WORD = 2
    PLAYER_ALREADY_EXISTS = 3
    NOT_SESSION_OWNER = 4
