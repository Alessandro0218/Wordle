import os

from dotenv import load_dotenv
from fastapi import APIRouter
from fastapi.responses import RedirectResponse

from backend.auth.service import callbackLogic

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
    return callbackLogic(code=code)
