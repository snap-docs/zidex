from fastapi import APIRouter, HTTPException, Header
from models.user import UserSignup, UserLogin, TokenResponse, UserResponse
from database import get_db
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])


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

        # Create user record in users table
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

        # Get user record
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
