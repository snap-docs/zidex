from fastapi import APIRouter, HTTPException, Header, Query
from models.explanation import ExplanationRecord, SaveRequest
from database import get_db
from datetime import datetime
from typing import List, Optional

router = APIRouter(prefix="/history", tags=["history"])


def get_user_from_token(token: str):
    db = get_db()
    try:
        clean_token = token.replace("Bearer ", "")
        user = db.auth.get_user(clean_token)
        if not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user
    except Exception:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("")
async def get_history(
    authorization: str = Header(...),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0)
):
    user = get_user_from_token(authorization)
    db = get_db()

    result = db.table("explanations").select("*").eq(
        "user_id", user.id
    ).order(
        "created_at", desc=True
    ).range(offset, offset + limit - 1).execute()

    return {
        "items": result.data,
        "total": len(result.data),
        "limit": limit,
        "offset": offset
    }


@router.get("/frequently-asked")
async def get_frequently_asked(authorization: str = Header(...)):
    user = get_user_from_token(authorization)
    db = get_db()

    result = db.table("frequently_asked").select("*").eq(
        "user_id", user.id
    ).order("count", desc=True).limit(10).execute()

    return {"items": result.data}


@router.post("/save")
async def save_explanation(
    data: SaveRequest,
    authorization: str = Header(...)
):
    user = get_user_from_token(authorization)
    db = get_db()

    # Verify explanation belongs to user
    explanation = db.table("explanations").select("*").eq(
        "id", data.explanation_id
    ).eq("user_id", user.id).single().execute()

    if not explanation.data:
        raise HTTPException(status_code=404, detail="Explanation not found")

    # Check not already saved
    existing = db.table("saved_items").select("*").eq(
        "user_id", user.id
    ).eq("explanation_id", data.explanation_id).execute()

    if existing.data:
        return {"message": "Already saved"}

    db.table("saved_items").insert({
        "user_id": user.id,
        "explanation_id": data.explanation_id,
        "created_at": datetime.utcnow().isoformat()
    }).execute()

    return {"message": "Saved successfully"}


@router.get("/saved")
async def get_saved(authorization: str = Header(...)):
    user = get_user_from_token(authorization)
    db = get_db()

    result = db.table("saved_items").select(
        "*, explanations(*)"
    ).eq("user_id", user.id).order(
        "created_at", desc=True
    ).execute()

    return {"items": result.data}


@router.delete("/saved/{explanation_id}")
async def unsave_explanation(
    explanation_id: str,
    authorization: str = Header(...)
):
    user = get_user_from_token(authorization)
    db = get_db()

    db.table("saved_items").delete().eq(
        "user_id", user.id
    ).eq("explanation_id", explanation_id).execute()

    return {"message": "Removed from saved"}
