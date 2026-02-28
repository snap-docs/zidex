from fastapi import APIRouter, HTTPException, Header
from models.explanation import ExplainRequest, ExplainResponse
from database import get_db
from detector import detect_case, detect_language
from ai import get_explanation
from datetime import datetime, date

router = APIRouter(prefix="/explain", tags=["explain"])

FREE_DAILY_LIMIT = 30


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


def check_quota(user_id: str) -> bool:
    """
    Returns True if user can make a request.
    Checks daily usage against free tier limit.
    """
    db = get_db()

    # Check if pro user
    user_record = db.table("users").select("is_pro").eq(
        "id", user_id
    ).single().execute()

    if user_record.data.get("is_pro", False):
        return True

    # Count today's explanations
    today = date.today().isoformat()
    count_result = db.table("explanations").select(
        "id", count="exact"
    ).eq("user_id", user_id).gte(
        "created_at", f"{today}T00:00:00"
    ).execute()

    count = count_result.count or 0
    return count < FREE_DAILY_LIMIT


def get_daily_usage(user_id: str) -> dict:
    db = get_db()
    today = date.today().isoformat()
    count_result = db.table("explanations").select(
        "id", count="exact"
    ).eq("user_id", user_id).gte(
        "created_at", f"{today}T00:00:00"
    ).execute()

    used = count_result.count or 0
    return {
        "used": used,
        "limit": FREE_DAILY_LIMIT,
        "remaining": max(0, FREE_DAILY_LIMIT - used)
    }


@router.post("", response_model=ExplainResponse)
async def explain(
    data: ExplainRequest,
    authorization: str = Header(...)
):
    user = get_user_from_token(authorization)

    # Check quota
    if not check_quota(user.id):
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit of {FREE_DAILY_LIMIT} explanations reached. Upgrade to Pro for unlimited."
        )

    # Detect case type and language
    case_type = detect_case(data.selected_text)
    language = detect_language(data.selected_text) if case_type == "code" else "N/A"

    # Get AI explanation
    result = get_explanation(
        text=data.selected_text,
        case_type=case_type,
        language=language,
        context=data.context or ""
    )

    # Save to database
    db = get_db()
    db.table("explanations").insert({
        "user_id": user.id,
        "selected_text": data.selected_text[:500],
        "explanation": result["explanation"],
        "case_type": case_type,
        "language": language,
        "app_name": data.app_name or "",
        "created_at": datetime.utcnow().isoformat()
    }).execute()

    # Update frequently_asked table
    _update_frequently_asked(user.id, case_type, language)

    return ExplainResponse(
        explanation=result["explanation"],
        case_type=case_type,
        language=language,
        provider=result["provider"],
        success=result["success"]
    )


def _update_frequently_asked(user_id: str, case_type: str, language: str):
    """Track what users ask about most."""
    db = get_db()
    topic = language if case_type == "code" else case_type

    existing = db.table("frequently_asked").select("*").eq(
        "user_id", user_id
    ).eq("topic", topic).execute()

    if existing.data:
        record = existing.data[0]
        db.table("frequently_asked").update({
            "count": record["count"] + 1,
            "last_asked": datetime.utcnow().isoformat()
        }).eq("id", record["id"]).execute()
    else:
        db.table("frequently_asked").insert({
            "user_id": user_id,
            "topic": topic,
            "count": 1,
            "last_asked": datetime.utcnow().isoformat()
        }).execute()


@router.get("/quota")
async def get_quota(authorization: str = Header(...)):
    user = get_user_from_token(authorization)
    return get_daily_usage(user.id)
