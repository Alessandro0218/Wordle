import json
from enum import IntEnum

from pydantic import BaseModel
from starlette.authentication import BaseUser


class User(BaseModel):
    id: int
    discord_id: str
    discord_username: str
    discord_avatar: str

    @classmethod
    def from_json(cls, json_str: str):
        return cls(**json.loads(json_str))

    def to_json(self):
        return self.model_dump()


class GameErrorType(IntEnum):
    GENERAL_ERROR = 0
    SESSION_NOT_FOUND = 1
    INVALID_WORD = 2
    PLAYER_ALREADY_EXISTS = 3
    NOT_SESSION_OWNER = 4
    GAME_ALREADY_FINISHED = 5
    INVALID_PLAYER = 6


class AuthenticatedUser(BaseUser):
    def __init__(self, user_model: User):
        self.user_model = user_model

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def username(self) -> str:
        return self.user_model.discord_username

    @property
    def id(self) -> int:
        return self.user_model.id
