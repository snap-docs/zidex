# simpledocs-backend

AI-powered code explanation REST API for the simpledocs.ai widget.

## Stack

- **FastAPI** — async Python web framework
- **Supabase** — managed Postgres + built-in Auth (JWT + Google OAuth)
- **Groq** — primary AI (LLaMA 3.3 70B, fastest inference)
- **Gemini** — fallback AI (Gemini 2.0 Flash)
- **Uvicorn** — ASGI server

## Quick Start

```bash
cp .env.example .env    # Fill in your keys
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Swagger docs → http://localhost:8000/docs
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon/public key |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret |
| `GROQ_API_KEY` | Groq API key (primary AI) |
| `GEMINI_API_KEY` | Gemini API key (fallback AI) |

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/signup` | Register with email + password |
| `POST` | `/auth/login` | Login, returns JWT |
| `POST` | `/auth/logout` | Sign out |
| `GET`  | `/auth/me` | Current user profile |
| `GET`  | `/auth/google` | Get Google OAuth URL |
| `GET`  | `/auth/callback` | Google OAuth redirect handler |
| `POST` | `/auth/google/token` | Token bridge for hash-fragment OAuth |
| `GET`  | `/auth/google/status` | Poll for Google login completion |

### Explain
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/explain` | Explain selected text (30/day free) |
| `GET`  | `/explain/quota` | Daily usage remaining |

### History
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/history` | All past explanations |
| `GET`    | `/history/frequently-asked` | Most queried topics |
| `POST`   | `/history/save` | Bookmark an explanation |
| `GET`    | `/history/saved` | All saved items |
| `DELETE` | `/history/saved/{id}` | Remove a saved item |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | App info |
| `GET` | `/health` | Health check |

## AI Logic

```
POST /explain
  → detect_case(): "code" | "error" | "other"
  → detect_language(): Python, JS, Rust, SQL…
  → get_explanation():
      try Groq (LLaMA 3.3 70B)
      fallback → Gemini 2.0 Flash
  → save to explanations table
  → update frequently_asked table
  → return structured explanation
```

## Supabase Tables

```sql
users           -- user metadata + pro status
explanations    -- every AI explanation made
frequently_asked -- per-user topic frequency tracking
saved_items     -- bookmarked explanations
```

See the [root README](../README.md) for full SQL and Supabase setup instructions.

## Deployment (Railway)

1. Push this folder to a GitHub repo
2. Create Railway project → Deploy from GitHub
3. Add all 5 environment variables
4. Railway auto-detects FastAPI → deploys automatically
5. Update `BACKEND_URL` in the Tauri widget's `constants.ts`
