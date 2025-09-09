import os

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse, Response

from backend.auth.service import callbackLogic, get_user_data_from_token

router = APIRouter()
dotenv_path = os.path.join(os.path.dirname(__file__), "env", ".env")
load_dotenv(dotenv_path=dotenv_path)


def require_user_token(request: Request):
    token = request.cookies.get("user_token")
    if not token:
        return Response(status_code=401, content="Unauthorized: No token provided")
    try:
        user_data = get_user_data_from_token(token)
        if not user_data:
            return Response(status_code=401, content="Unauthorized: Invalid token")
    except Exception as e:
        return Response(status_code=401, content=f"Unauthorized: {str(e)}")
    return token


@router.get("/discord/login")
def login():
    return RedirectResponse(
        url="https://discord.com/oauth2/authorize?client_id=1385329136553431050&response_type=code&redirect_uri=http%3A%2F%2F192.168.0.2%3A8000%2Fauth%2Fdiscord%2Fcallback&scope=identify"
    )


@router.get("/discord/callback")
def callback(code: str):
    return callbackLogic(code=code)


@router.get("/user")
def get_user(user_token: str = Depends(require_user_token)):
    return get_user_data_from_token(user_token)
