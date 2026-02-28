from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

_supabase: Client | None = None

def get_db() -> Client:
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY are not configured. Set them in your .env file.")
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase
