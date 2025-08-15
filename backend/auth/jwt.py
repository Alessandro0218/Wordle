import os

import jwt


def create_jwt_token(data: dict) -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise ValueError("JWT_SECRET environment variable is not set")
    return jwt.encode(payload=data, key=secret, algorithm="HS256")


def decode_jwt_token(token: str) -> dict:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise ValueError("JWT_SECRET environment variable is not set")
    return jwt.decode(jwt=token, key=secret, algorithms="HS256")


def verify_jwt_token(token: str) -> dict | None:
    try:
        return decode_jwt_token(token)
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


def check_token_middleware(token: str) -> bool:
    return verify_jwt_token(token) is not None
