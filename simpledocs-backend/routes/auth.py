from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import HTMLResponse
from models.user import UserSignup, UserLogin, TokenResponse, UserResponse
from database import get_db
from datetime import datetime, timedelta
import secrets

router = APIRouter(prefix="/auth", tags=["auth"])

# ─── In-memory pending token store ────────────────────────────────────────────
# { session_id: { "token": str, "user": dict, "expires": datetime } }
_pending: dict = {}

def _clean_pending():
    """Remove expired pending tokens."""
    now = datetime.utcnow()
    expired = [k for k, v in _pending.items() if v["expires"] < now]
    for k in expired:
        del _pending[k]


# ─── Existing routes (unchanged) ──────────────────────────────────────────────

@router.post("/signup", response_model=TokenResponse)
async def signup(data: UserSignup):
    db = get_db()
    try:
        response = db.auth.sign_up({
            "email": data.email,
            "password": data.password
        })

        if response.user is None:
            raise HTTPException(status_code=400, detail="Signup failed")

        # If email confirmation is enabled, session is None until user confirms
        if response.session is None:
            raise HTTPException(
                status_code=202,
                detail="Check your email to confirm your account before logging in"
            )

        db.table("users").insert({
            "id": response.user.id,
            "email": data.email,
            "is_pro": False,
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return TokenResponse(
            access_token=response.session.access_token,
            user=UserResponse(
                id=response.user.id,
                email=data.email,
                is_pro=False,
                created_at=datetime.utcnow()
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    db = get_db()
    try:
        response = db.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })

        if response.user is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_record = db.table("users").select("*").eq(
            "id", response.user.id
        ).single().execute()

        user_data = user_record.data

        return TokenResponse(
            access_token=response.session.access_token,
            user=UserResponse(
                id=response.user.id,
                email=response.user.email,
                is_pro=user_data.get("is_pro", False),
                created_at=datetime.fromisoformat(user_data["created_at"])
            )
        )

    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/logout")
async def logout(authorization: str = Header(...)):
    db = get_db()
    try:
        db.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception:
        return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(authorization: str = Header(...)):
    db = get_db()
    try:
        token = authorization.replace("Bearer ", "")
        user = db.auth.get_user(token)

        if not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        user_record = db.table("users").select("*").eq(
            "id", user.user.id
        ).single().execute()

        user_data = user_record.data

        return UserResponse(
            id=user.user.id,
            email=user.user.email,
            is_pro=user_data.get("is_pro", False),
            created_at=datetime.fromisoformat(user_data["created_at"])
        )

    except Exception as e:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── Google OAuth routes (new) ─────────────────────────────────────────────────

@router.get("/google")
async def google_auth():
    """
    Generate a Google OAuth URL + a session_id so the widget can poll for the
    token once the callback is received.
    """
    db = get_db()
    session_id = secrets.token_urlsafe(32)

    try:
        result = db.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": f"http://localhost:8000/auth/callback",
                "query_params": {"state": session_id},
            }
        })
        return {"url": result.url, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Google URL: {e}")


@router.get("/callback")
async def google_callback(code: str = None, state: str = None, error: str = None):
    """
    Supabase redirects here after the user approves Google login.
    We exchange the code, store the token for polling, and show a close-tab page.
    """
    if error:
        return HTMLResponse(
            content=_close_page("Login cancelled. You can close this tab."),
            status_code=200
        )

    if not code or not state:
        return HTMLResponse(
            content=_close_page("Missing parameters. Please try again."),
            status_code=400
        )

    db = get_db()
    try:
        # Exchange code for session
        session = db.auth.exchange_code_for_session({"auth_code": code})

        if not session.session:
            raise Exception("No session returned")

        user = session.user
        access_token = session.session.access_token

        # Upsert user into users table
        existing = db.table("users").select("id").eq("id", user.id).execute()
        if not existing.data:
            db.table("users").insert({
                "id": user.id,
                "email": user.email,
                "is_pro": False,
                "created_at": datetime.utcnow().isoformat()
            }).execute()

        # Store token for widget polling (expires in 5 min)
        _clean_pending()
        _pending[state] = {
            "token": access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "is_pro": False,
            },
            "expires": datetime.utcnow() + timedelta(minutes=5)
        }

        return HTMLResponse(content=_close_page("✓ Logged in! You can close this tab."))

    except Exception as e:
        return HTMLResponse(
            content=_close_page(f"Login failed: {str(e)}"),
            status_code=500
        )


@router.get("/google/status")
async def google_status(session_id: str):
    """
    Widget polls this every 2 seconds after opening the browser.
    Returns the token once the callback is received, then clears it.
    """
    _clean_pending()
    entry = _pending.get(session_id)
    if not entry:
        return {"status": "pending"}

    # Return token and immediately remove from memory
    token = entry["token"]
    user  = entry["user"]
    del _pending[session_id]
    return {"status": "ok", "access_token": token, "user": user}


def _close_page(message: str) -> str:
    """Simple HTML page that auto-closes after OAuth redirect."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <title>simpledocs.ai</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0e;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }}
    .box {{
      text-align: center;
      padding: 40px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
    }}
    .icon {{ font-size: 40px; margin-bottom: 16px; }}
    p {{ color: rgba(255,255,255,0.7); margin-top: 8px; font-size: 14px; }}
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">✦</div>
    <h2>simpledocs.ai</h2>
    <p>{message}</p>
    <p style="margin-top:16px;font-size:12px;opacity:.5">This tab will close in 3 seconds…</p>
  </div>
  <script>setTimeout(() => window.close(), 3000);</script>
</body>
</html>"""
