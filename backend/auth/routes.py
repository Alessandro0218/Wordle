import os

import requests
from dotenv import load_dotenv
from fastapi import APIRouter
from fastapi.responses import RedirectResponse

from backend.auth.database import Database
from backend.auth.jwt import create_jwt_token

router = APIRouter()
dotenv_path = os.path.join(os.path.dirname(__file__), "env", ".env")
load_dotenv(dotenv_path=dotenv_path)


@router.get("/discord/login")
def login():
    return RedirectResponse(
        url="https://discord.com/oauth2/authorize?client_id=1385329136553431050&response_type=code&redirect_uri="
        "http%3A%2F%2Flocalhost%3A8000%2Fauth%2Fdiscord%2Fcallback&scope=identify"
    )


@router.get("/discord/callback")
def callback(code: str):
    CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "")
    CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "")
    print(f"{CLIENT_ID=}, {CLIENT_SECRET=}")
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

    print(f"{user_data=}, {token_data=}")

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

    response = RedirectResponse(url="http://localhost:4200/")
    response.set_cookie(
        key="user_token",
        value=jwt_token,
        httponly=True,
        secure=False,
        samesite="lax",
    )
    return response
