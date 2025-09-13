import os

from auth.service import callbackLogic, get_user_data_from_token
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response

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
    return RedirectResponse(os.getenv("DISCORD_OAUTH_URL", ""))


@router.get("/discord/callback")
def callback(code: str):
    return callbackLogic(code=code)


@router.get("/user")
def get_user(user_token: str = Depends(require_user_token)):
    return get_user_data_from_token(user_token)


@router.post("/logout")
async def logout(response: Response):
    response = JSONResponse(status_code=200, content={"message": "Logged out successfully"})
    response.delete_cookie(
        key="user_token",
        path="/",
        domain="192.168.0.2",
        httponly=True,
        secure=False,
        samesite="lax",
    )
    return response
