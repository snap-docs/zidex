from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ExplainRequest(BaseModel):
    selected_text: str
    context: Optional[str] = ""
    app_name: Optional[str] = ""


class ExplainResponse(BaseModel):
    explanation: str
    case_type: str
    language: str
    provider: str
    success: bool


class ExplanationRecord(BaseModel):
    id: str
    user_id: str
    selected_text: str
    explanation: str
    case_type: str
    language: str
    created_at: datetime


class SaveRequest(BaseModel):
    explanation_id: str
