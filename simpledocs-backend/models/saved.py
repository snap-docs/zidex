from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SavedItem(BaseModel):
    id: str
    user_id: str
    explanation_id: str
    created_at: datetime
