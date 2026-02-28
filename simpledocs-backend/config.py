import os
from dotenv import load_dotenv

load_dotenv()

# Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")

# AI Keys
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Groq models to try in order
GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
]

# Gemini models to try in order
GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]

# Free tier limit
FREE_DAILY_LIMIT = 30

# App
APP_NAME = "simpledocs.ai"
APP_VERSION = "1.0.0"

import warnings

# Validate at startup — warn instead of crash so local dev can boot without keys
if not SUPABASE_URL or not SUPABASE_KEY:
    warnings.warn("SUPABASE_URL and SUPABASE_KEY are not set — database calls will fail", stacklevel=2)

if not GROQ_API_KEY and not GEMINI_API_KEY:
    warnings.warn("No AI API key set — /explain will return errors", stacklevel=2)
