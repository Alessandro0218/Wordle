import os

import requests
from auth.database import Database
from auth.domain import User
from auth.jwt import create_jwt_token, verify_jwt_token
from fastapi.responses import RedirectResponse


def callbackLogic(code: str):
    CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "")
    CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "")
    token_response = requests.post(
        "https://discord.com/api/oauth2/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": os.getenv("DISCORD_REDIRECT_URI"),
        },
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
        },
        auth=(CLIENT_ID, CLIENT_SECRET),
    )

    if token_response.status_code != 200:
        return {"error": token_response.text, "status_code": token_response.status_code}
    token_data = token_response.json()

    user_response = requests.get(
        "https://discord.com/api/users/@me",
        headers={
            "Authorization": f"Bearer {token_data['access_token']}",
        },
    )

    if user_response.status_code != 200:
        return {"error": user_response.text, "status_code": user_response.status_code}

    user_data = user_response.json()

    db = Database()
    user = db.create_user(
        discord_id=user_data.get("id"),
        discord_username=user_data.get("username"),
        discord_avatar=user_data.get("avatar", ""),
        discord_token=token_data.get("access_token"),
        discord_refresh_token=token_data.get("refresh_token"),
    )

    jwt_token = create_jwt_token(
        data={
            "user_id": user.id,
            "discord_username": user.discord_username,
            "discord_avatar": user.discord_avatar,
        },
    )

    response = RedirectResponse(url=f"http://{os.getenv('APPLICATION_HOST')}:{os.getenv('APPLICATION_EXPOSED_PORT')}/")
    response.set_cookie(
        key="user_token",
        value=jwt_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,  # 1 week
    )
    return response


def get_user_data_from_token(token: str) -> User:
    try:
        user_data = verify_jwt_token(token)
    except Exception as e:
        raise ValueError(f"Token verification failed: {str(e)}")
    if not user_data:
        raise ValueError("Invalid or expired token")
    db = Database()
    user = db.get_user_by_id(user_data["user_id"])
    if not user:
        raise ValueError("User not found")

    return User(**user.__dict__)
