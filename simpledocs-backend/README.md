# simpledocs-backend

AI-powered code explanation backend for simpledocs.ai.

## Setup

1. Copy `.env.example` to `.env` and fill in your keys:
   ```
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the server locally:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

4. Visit the interactive docs at: http://localhost:8000/docs

## Supabase Setup

Run the SQL in the Supabase SQL Editor to create the required tables:
- `users`
- `explanations`
- `frequently_asked`
- `saved_items`

See the main project README for the full SQL.

## Deployment (Railway)

1. Push to GitHub
2. Create a new Railway project → Deploy from GitHub
3. Add environment variables from `.env.example`
4. Railway auto-detects FastAPI and deploys with uvicorn

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Create account |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Get current user |
| POST | `/explain` | Explain selected text (requires auth) |
| GET | `/explain/quota` | Get daily usage (requires auth) |
| GET | `/history` | Get explanation history (requires auth) |
| GET | `/history/frequently-asked` | Top asked topics (requires auth) |
| POST | `/history/save` | Save an explanation (requires auth) |
| GET | `/history/saved` | Get saved items (requires auth) |
| DELETE | `/history/saved/{id}` | Remove saved item (requires auth) |
| GET | `/health` | Health check |

## AI Providers

- **Primary**: Groq (fast, free tier generous)
- **Fallback**: Gemini (Google)

Both keys are optional but at least one must be provided.
