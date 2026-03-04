# simpledocs.ai

> **AI-powered floating widget that explains code, errors, and text — instantly, without leaving your editor.**

[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri%20v2-24C8DB?logo=tauri)](https://tauri.app)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![AI](https://img.shields.io/badge/AI-Groq%20%2B%20Gemini-FF6B35)](https://groq.com)

---

## What is simpledocs.ai?

simpledocs.ai is a **floating OS-level desktop widget** for developers. It sits in a corner of your screen as a tiny draggable pill. You select confusing code, an error message, or any text — and it explains it instantly using AI, without switching context or leaving your editor.

### The problem it solves

Developers constantly context-switch:
- Select an error → open browser → Google it → open Stack Overflow → read through noise → back to editor
- This kills flow state and wastes 5–15 minutes per confusion

simpledocs.ai cuts that to **under 5 seconds**: select text → see explanation → keep coding.

---

## Features

| Feature | Description |
|---------|-------------|
| 🔵 **Floating pill widget** | Always-on-top, draggable 52×52px pill that lives in a screen corner |
| 📌 **Corner snapping** | Magnetically snaps to all 4 screen corners, stays above taskbar |
| 📖 **AI explanations** | Explains code, errors, and general text differently and appropriately |
| 🔍 **Smart detection** | Auto-detects if input is code, an error, or plain text |
| 💬 **Code language detection** | Identifies Python, JS, Rust, SQL etc. and tailors the explanation |
| 📜 **History** | Saves all your explanations to review later |
| ⭐ **Saved items** | Bookmark explanations you want to keep |
| 📊 **Usage tracking** | Daily quota tracking — 30 free explanations/day |
| 🔐 **Auth** | Email/password + Google OAuth login |
| 🆓 **Free tier** | 30 explanations/day free, unlimited on Pro |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 simpledocs.ai                        │
│                                                      │
│  ┌────────────────┐        ┌──────────────────────┐  │
│  │  Tauri Widget  │◄──────►│  FastAPI Backend      │  │
│  │  (Rust + React)│  HTTP  │  (Python)             │  │
│  │                │        │                       │  │
│  │  • Glass UI    │        │  • Auth routes        │  │
│  │  • Drag/Snap   │        │  • Explain route      │  │
│  │  • Login form  │        │  • History routes     │  │
│  │  • Result view │        │  • AI orchestration   │  │
│  └────────────────┘        └──────────┬───────────┘  │
│                                       │               │
│                            ┌──────────▼───────────┐  │
│                            │  Supabase             │  │
│                            │  • Auth (JWT)         │  │
│                            │  • PostgreSQL DB      │  │
│                            │  • Row Level Security │  │
│                            └──────────┬───────────┘  │
│                                       │               │
│                     ┌─────────────────┼──────────┐   │
│                     │                 │           │   │
│              ┌──────▼──┐      ┌───────▼────┐     │   │
│              │  Groq   │      │  Gemini    │     │   │
│              │ LLaMA 3 │      │ 2.0 Flash  │     │   │
│              └─────────┘      └────────────┘     │   │
└─────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
zedex.ai/
├── simpledocs-tauri/          # Desktop widget (Tauri v2 + React)
│   ├── src/
│   │   ├── components/        # GlassPill, App shell
│   │   ├── screens/
│   │   │   ├── LoginScreen/   # Auth UI (email + Google)
│   │   │   └── ResultScreen/  # AI explanation display
│   │   ├── hooks/
│   │   │   ├── useWindow.ts   # Drag, snap, expand/collapse
│   │   │   └── useAuth.ts     # Login, signup, Google OAuth
│   │   ├── stores/
│   │   │   ├── authStore.ts   # Zustand auth state
│   │   │   └── windowStore.ts # Window position/corner state
│   │   ├── services/
│   │   │   ├── api.ts         # Axios instance with auth interceptor
│   │   │   └── authService.ts # Auth API calls
│   │   ├── styles/
│   │   │   └── glass.css      # Glassmorphism design system
│   │   └── utils/
│   │       ├── constants.ts   # Sizes, colors, backend URL
│   │       └── storage.ts     # LocalStorage token persistence
│   └── src-tauri/
│       ├── src/
│       │   ├── main.rs        # Tauri app entry, plugin setup
│       │   └── commands/
│       │       ├── window.rs  # snap_to_corner, set_window_position
│       │       └── capture.rs # get_selected_text (OS clipboard)
│       ├── Cargo.toml         # Rust dependencies
│       ├── tauri.conf.json    # Window config (52×52 transparent)
│       └── capabilities/
│           └── default.json   # Tauri permission declarations
│
└── simpledocs-backend/        # REST API (FastAPI + Python)
    ├── main.py                # App entry, CORS, router registration
    ├── config.py              # Env var loading and validation
    ├── database.py            # Supabase singleton client
    ├── ai.py                  # Groq → Gemini fallback AI calls
    ├── detector.py            # Code/error/text classifier
    ├── routes/
    │   ├── auth.py            # signup, login, logout, /me, Google OAuth
    │   ├── explain.py         # POST /explain, quota checking
    │   └── history.py         # explanation history, saved items
    ├── models/
    │   ├── user.py            # UserSignup, TokenResponse etc.
    │   ├── explanation.py     # ExplainRequest, ExplainResponse
    │   └── saved.py           # SavedItem model
    └── requirements.txt
```

---

## Tech Stack

### Widget — `simpledocs-tauri`

| Technology | Role | Why chosen |
|-----------|------|-----------|
| **Tauri v2** (Rust) | Desktop app shell | Native OS integration, tiny bundle size (~5MB vs Electron's 150MB+), true transparency, always-on-top |
| **React 18** | UI framework | Component model, Framer Motion integration, ecosystem |
| **TypeScript** | Language | Type safety for Tauri API calls and store management |
| **Vite** | Build tool | Sub-second HMR, fastest dev experience for Tauri |
| **Framer Motion** | Animations | Spring physics for expand/collapse, smooth corner snap |
| **Zustand** | State management | Minimal boilerplate, works perfectly with Tauri's async patterns |
| **Axios** | HTTP client | Interceptor support for auto-injecting Bearer tokens |
| **tauri-plugin-shell** | Open URLs | Opens Google OAuth URL in system browser |
| **tauri-plugin-global-shortcut** | Hotkeys | Future: trigger widget via keyboard shortcut |

**Why Tauri over Electron?**
- **10× smaller** binary (no bundled Chromium)
- **Native OS window** with true transparency and `always_on_top`
- **Rust backend** enables low-level OS integration (window positioning, clipboard capture)
- **Security** — capability-based permission system, no Node.js in renderer

### Backend — `simpledocs-backend`

| Technology | Role | Why chosen |
|-----------|------|-----------|
| **FastAPI** | Web framework | Async Python, auto-generated OpenAPI docs, Pydantic validation |
| **Supabase** | Auth + Database | Managed Postgres + Auth-in-one, Row Level Security, Google OAuth built-in |
| **Groq API** | Primary AI | Fastest inference available — LLaMA 3.3 70B at ~500 tokens/sec |
| **Gemini API** | Fallback AI | Google's Gemini 2.0 Flash — free tier, reliable fallback |
| **Python-dotenv** | Config | Clean environment variable management |
| **Pydantic v2** | Validation | Request/response schema validation with type safety |
| **Uvicorn** | ASGI server | Production-grade async server for FastAPI |

**Why Groq as primary AI?**
- Consistently **fastest inference** for LLaMA models (~10× faster than OpenAI)
- Free tier is generous for development and early users
- LLaMA 3.3 70B quality is comparable to GPT-4o for code explanations

**Why Supabase over custom DB?**
- Auth + PostgreSQL + RLS in one service
- Google OAuth is a toggle in the dashboard, not a 3-day integration
- Edge functions and real-time subscriptions available for future features
- Free tier is sufficient for early users

---

## Database Schema

```sql
-- User metadata (auth is Supabase built-in)
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  email       TEXT NOT NULL,
  is_pro      BOOLEAN DEFAULT false,
  daily_count INTEGER DEFAULT 0,
  last_reset  DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Every explanation request
CREATE TABLE explanations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  selected_text TEXT NOT NULL,
  explanation   TEXT NOT NULL,
  case_type     TEXT DEFAULT 'code',   -- 'code' | 'error' | 'other'
  language      TEXT DEFAULT 'N/A',   -- detected language
  app_name      TEXT DEFAULT '',       -- which app text was copied from
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Tracks what topics each user asks about most
CREATE TABLE frequently_asked (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  topic      TEXT NOT NULL,
  count      INTEGER DEFAULT 1,
  last_asked TIMESTAMPTZ DEFAULT now()
);

-- User-bookmarked explanations
CREATE TABLE saved_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  explanation_id UUID REFERENCES explanations(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/signup` | ❌ | Create account with email + password |
| `POST` | `/auth/login` | ❌ | Login, returns JWT access token |
| `POST` | `/auth/logout` | ✅ | Invalidate session |
| `GET`  | `/auth/me` | ✅ | Get current user profile |
| `GET`  | `/auth/google` | ❌ | Get Google OAuth URL |
| `GET`  | `/auth/callback` | ❌ | Google OAuth callback handler |
| `POST` | `/auth/google/token` | ❌ | JS bridge — receives token from hash fragment |
| `GET`  | `/auth/google/status` | ❌ | Poll for Google login completion |

### Explain

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/explain` | ✅ | Explain selected text (30/day free) |
| `GET`  | `/explain/quota` | ✅ | Check daily usage remaining |

### History

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`    | `/history` | ✅ | All past explanations |
| `GET`    | `/history/frequently-asked` | ✅ | Most queried topics |
| `POST`   | `/history/save` | ✅ | Bookmark an explanation |
| `GET`    | `/history/saved` | ✅ | All bookmarked explanations |
| `DELETE` | `/history/saved/{id}` | ✅ | Remove a bookmark |

---

## Setup & Development

### Prerequisites
- [Node.js](https://nodejs.org) v18+
- [Rust](https://rustup.rs) (latest stable)
- [Python](https://python.org) 3.11+
- A [Supabase](https://supabase.com) project (free)
- A [Groq](https://console.groq.com) API key (free) and/or [Gemini](https://aistudio.google.com) API key

### 1. Clone & configure

```bash
git clone https://github.com/your-org/zedex.ai.git
cd zedex.ai
```

### 2. Backend setup

```bash
cd simpledocs-backend
cp .env.example .env
# Fill in .env with your actual keys
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# API docs → http://localhost:8000/docs
```

### 3. Supabase tables

Run this in your project's **SQL Editor**:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL, is_pro BOOLEAN DEFAULT false,
  daily_count INTEGER DEFAULT 0, last_reset DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  selected_text TEXT, explanation TEXT, case_type TEXT DEFAULT 'code',
  language TEXT DEFAULT 'N/A', app_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS frequently_asked (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT, count INTEGER DEFAULT 1, last_asked TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  explanation_id UUID REFERENCES explanations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequently_asked ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "own" ON explanations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON frequently_asked FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON saved_items FOR ALL USING (auth.uid() = user_id);
```

### 4. Supabase Dashboard config

- **Auth → URL Configuration → Site URL**: `http://localhost:8000`
- **Auth → URL Configuration → Redirect URLs**: `http://localhost:8000/auth/callback`
- **Auth → Providers → Google**: Enable and paste Client ID + Secret from Google Cloud Console

### 5. Widget setup

```bash
cd simpledocs-tauri
npm install
npm run tauri dev     # Launches the floating widget
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | `https://xxxx.supabase.co` — from Supabase → Settings → API |
| `SUPABASE_KEY` | ✅ | Anon/public key — from Supabase → Settings → API |
| `SUPABASE_JWT_SECRET` | ✅ | JWT secret — Supabase → Settings → API → JWT Settings |
| `GROQ_API_KEY` | ⚠️ | Primary AI — [console.groq.com](https://console.groq.com) |
| `GEMINI_API_KEY` | ⚠️ | Fallback AI — [aistudio.google.com](https://aistudio.google.com) |

> ⚠️ At least one of `GROQ_API_KEY` or `GEMINI_API_KEY` must be provided.

---

## How the Widget Works

```
User selects text in any app
         │
         ▼
  [Pill glows / user clicks]
         │
         ▼
  Widget expands to 320×280
         │
         ▼
  (if not logged in) → Login screen
         │
         ▼
  POST /explain with selected text
         │
         ▼
  Backend: detect_case() → "code" | "error" | "other"
         │
         ▼
  Backend: get_explanation() → Groq LLaMA 3 → result
         │ (if Groq fails)
         └──► Gemini 2.0 Flash → result
         │
         ▼
  Save to explanations table
         │
         ▼
  Widget shows structured result:
    ✦ WHAT IT DOES
    ✦ WHY IT MATTERS
    ✦ HOW IT CONNECTS
    ✦ SUGGESTION
```

---

## Deployment

### Backend → Railway

```bash
# 1. Push simpledocs-backend to GitHub
# 2. New Railway project → Deploy from GitHub repo
# 3. Add environment variables (all 5 from .env.example)
# 4. Railway auto-detects Python → deploys with uvicorn
# 5. Copy the Railway domain and update tauri BACKEND_URL
```

### Widget → Tauri build

```bash
cd simpledocs-tauri
npm run tauri build   # Creates .exe installer in src-tauri/target/release/bundle
```

---

## Roadmap

- [ ] Global keyboard shortcut to trigger explain
- [ ] Multi-monitor support
- [ ] Pro tier — unlimited explanations
- [ ] Plugin for VS Code (send selection directly)
- [ ] Team plans — shared history
- [ ] Windows / macOS / Linux builds via GitHub Actions

---

## License

MIT © 2026 simpledocs.ai / zedex.ai
