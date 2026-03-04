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


# ─── Google OAuth routes ───────────────────────────────────────────────────────

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
                "redirect_to": "http://localhost:8000/auth/callback",
                "query_params": {"state": session_id},
            }
        })
        return {"url": result.url, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Google URL: {e}")


@router.get("/callback")
async def google_callback(code: str = None, state: str = None, error: str = None):
    """
    Supabase redirects here. Handles two flows:
    1. PKCE flow: code + state arrive as query params → exchange code for session
    2. Implicit flow: access_token arrives as hash fragment → JS reads it and
       POSTs it to /auth/google/token (server never sees hash fragments)
    """
    if error:
        return HTMLResponse(content=_close_page_error("Login cancelled."))

    # ── PKCE flow: code in query params ──────────────────────────────────────
    if code and state:
        db = get_db()
        try:
            session = db.auth.exchange_code_for_session({"auth_code": code})
            if not session.session:
                raise Exception("No session returned")

            user = session.user
            access_token = session.session.access_token

            existing = db.table("users").select("id").eq("id", user.id).execute()
            if not existing.data:
                db.table("users").insert({
                    "id": user.id,
                    "email": user.email,
                    "is_pro": False,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()

            _clean_pending()
            _pending[state] = {
                "token": access_token,
                "user": {"id": user.id, "email": user.email, "is_pro": False},
                "expires": datetime.utcnow() + timedelta(minutes=5)
            }
            return HTMLResponse(content=_close_page_success())
        except Exception as e:
            return HTMLResponse(content=_close_page_error(f"Login failed: {e}"), status_code=500)

    # ── Implicit/hash flow: JS reads hash, POSTs token to /auth/google/token ──
    # (state may or may not be in query params depending on Supabase version)
    return HTMLResponse(content=_hash_reader_page(state))


@router.post("/google/token")
async def google_token_from_hash(payload: dict):
    """
    Called by the hash-reader JS page with the access_token from the URL fragment.
    Validates the token, upserts the user, stores in pending dict.
    """
    access_token = payload.get("access_token")
    session_id   = payload.get("state")

    if not access_token:
        raise HTTPException(status_code=400, detail="No access_token in payload")

    db = get_db()
    try:
        user_resp = db.auth.get_user(access_token)
        if not user_resp.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = user_resp.user
        existing = db.table("users").select("id").eq("id", user.id).execute()
        if not existing.data:
            db.table("users").insert({
                "id": user.id,
                "email": user.email,
                "is_pro": False,
                "created_at": datetime.utcnow().isoformat()
            }).execute()

        # Use provided state as session_id, or fall back to a new one
        # Widget will get this via polling using the original session_id
        if session_id:
            _clean_pending()
            _pending[session_id] = {
                "token": access_token,
                "user": {"id": user.id, "email": user.email, "is_pro": False},
                "expires": datetime.utcnow() + timedelta(minutes=5)
            }
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/google/status")
async def google_status(session_id: str):
    """
    Widget polls this every 2 seconds after opening the browser.
    Returns the token once either the PKCE callback or hash-reader has stored it.
    """
    _clean_pending()
    entry = _pending.get(session_id)
    if not entry:
        return {"status": "pending"}

    token = entry["token"]
    user  = entry["user"]
    del _pending[session_id]
    return {"status": "ok", "access_token": token, "user": user}


# ─── HTML helpers ──────────────────────────────────────────────────────────────

def _hash_reader_page(state: str | None) -> str:
    """
    Page shown when Supabase uses implicit flow (tokens in hash fragment).
    JS reads the fragment, extracts access_token + state, POSTs to /auth/google/token.
    """
    state_fallback = state or ""
    return f"""<!DOCTYPE html>
<html>
<head>
  <title>simpledocs.ai — signing in…</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0e; color: #f8fafc;
      display: flex; align-items: center; justify-content: center;
      height: 100vh; margin: 0;
    }}
    .box {{
      text-align: center; padding: 40px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
    }}
    p {{ color: rgba(255,255,255,0.6); font-size: 14px; }}
  </style>
</head>
<body>
  <div class="box">
    <div style="font-size:40px;margin-bottom:16px">✦</div>
    <h2>simpledocs.ai</h2>
    <p id="msg">Completing sign-in…</p>
  </div>
  <script>
    (async () => {{
      const hash = window.location.hash.substring(1);
      const params = Object.fromEntries(new URLSearchParams(hash));
      const access_token = params.access_token;
      // state can come from URL query params or from hash
      const qp = new URLSearchParams(window.location.search);
      const state = qp.get('state') || params.state || '{state_fallback}';

      if (!access_token) {{
        document.getElementById('msg').textContent = 'No token found. Please try again.';
        return;
      }}

      try {{
        const res = await fetch('/auth/google/token', {{
          method: 'POST',
          headers: {{'Content-Type': 'application/json'}},
          body: JSON.stringify({{ access_token, state }})
        }});
        if (res.ok) {{
          document.getElementById('msg').textContent = '✓ Logged in! Closing…';
          setTimeout(() => window.close(), 2000);
        }} else {{
          const err = await res.json();
          document.getElementById('msg').textContent = 'Error: ' + (err.detail || 'Unknown error');
        }}
      }} catch(e) {{
        document.getElementById('msg').textContent = 'Network error. Please try again.';
      }}
    }})();
  </script>
</body>
</html>"""


def _close_page_success() -> str:
    return """<!DOCTYPE html>
<html>
<head><title>simpledocs.ai</title>
<style>body{font-family:-apple-system,sans-serif;background:#0a0a0e;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.box{text-align:center;padding:40px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px}p{color:rgba(255,255,255,.6);font-size:14px}</style>
</head>
<body><div class="box"><div style="font-size:40px;margin-bottom:16px">✦</div><h2>simpledocs.ai</h2>
<p>✓ Logged in! You can close this tab.</p>
<p style="font-size:12px;opacity:.5;margin-top:16px">Closing in 3 seconds…</p>
</div><script>setTimeout(()=>window.close(),3000);</script></body></html>"""


def _close_page_error(message: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><title>simpledocs.ai</title>
<style>body{{font-family:-apple-system,sans-serif;background:#0a0a0e;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}}.box{{text-align:center;padding:40px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px}}p{{color:rgba(255,255,255,.6);font-size:14px}}</style>
</head>
<body><div class="box"><div style="font-size:40px;margin-bottom:16px">✦</div><h2>simpledocs.ai</h2>
<p>{message}</p>
</div><script>setTimeout(()=>window.close(),4000);</script></body></html>"""

