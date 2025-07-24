from enum import IntEnum


class User:
    id: int
    discord_id: str
    discord_username: str
    discord_avatar: str
    discord_token: str | None
    discord_refresh_token: str | None


class GameErrorType(IntEnum):
    GENERAL_ERROR = 0
    SESSION_NOT_FOUND = 1
    INVALID_WORD = 2
