# AI Meeting Assistant

An AI-powered web application that transcribes meeting recordings, generates summaries, extracts action items, and drafts follow-up emails.

## Features

- **Upload** audio recordings (MP3, MP4, WAV, M4A, OGG, FLAC, WebM — up to 500MB)
- **Transcription** via OpenAI Whisper running locally
- **AI Summarization** — executive summary + key points (GPT-4o)
- **Action Item Extraction** — with assignee, due date, and priority (GPT-4o)
- **Follow-up Email Draft** — professional email ready to send (GPT-4o)
- **JWT Authentication** — user accounts with secure login
- **Real-time status** — 3-second polling shows processing progress

---

## Quickstart (Docker Compose)

### Prerequisites
- Docker + Docker Compose
- OpenAI API key

### 1. Clone and configure

```bash
git clone <your-repo-url>
cd project
cp .env.example .env
```

Edit `.env`:
```env
OPENAI_API_KEY=sk-...your key...
SECRET_KEY=  # generate with: openssl rand -hex 32
```

### 2. Start everything

```bash
docker compose up --build
```

This starts:
- **PostgreSQL** on port 5432
- **FastAPI backend** on port 8000 (runs Alembic migrations on startup)
- **React frontend** on port 3000 (nginx serves static files + proxies /api)

> **Note:** On first run the backend downloads the Whisper `base` model (~150MB). This happens inside Docker and takes a few minutes.

### 3. Open the app

Visit **http://localhost:3000**, register an account, and upload a meeting recording.

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env  # Fill in DATABASE_URL, OPENAI_API_KEY, SECRET_KEY

alembic upgrade head
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:5173
```

The Vite dev server proxies `/api` requests to `http://localhost:8000`.

---

## Auth Flow

1. **Register** (`POST /api/auth/register`) → creates user, returns UserResponse
2. **Login** (`POST /api/auth/login`) → validates credentials, returns JWT (7-day expiry)
3. **Token storage** → stored in `localStorage` as `access_token`
4. **Axios interceptor** → attaches `Authorization: Bearer <token>` to every request
5. **401 response** → clears token, redirects to `/login`
6. **Protected routes** → `ProtectedRoute` component redirects unauthenticated users
7. **All meeting data** → scoped to the authenticated user via `user_id` filter

---

## Processing Pipeline

When an audio file is uploaded, a background task runs:

1. **Whisper** transcribes audio → saved as `Transcript`
2. **GPT-4o** generates summary + key points → saved as `MeetingSummary`
3. **GPT-4o** extracts action items → saved as `ActionItem` records
4. **GPT-4o** drafts follow-up email → saved as `FollowUpEmail`
5. Meeting status updates: `pending` → `processing` → `completed` (or `failed`)

The frontend polls `/api/meetings/{id}/status` every 3 seconds and stops when status reaches `completed` or `failed`.

---

## Deployment — Railway

### Step-by-step

1. **Push code to GitHub**

2. **Go to [railway.app](https://railway.app)** → New Project → Deploy from GitHub repo

3. **Add PostgreSQL plugin**: In your project dashboard → Add Plugin → PostgreSQL

4. **Set environment variables** in the Railway dashboard for the backend service:
   - `OPENAI_API_KEY` — your OpenAI API key
   - `SECRET_KEY` — run `openssl rand -hex 32` locally to generate
   - `DATABASE_URL` — Railway auto-provides this from the PostgreSQL plugin (reference: `${{Postgres.DATABASE_URL}}`)

5. **Deploy backend first** (it runs `alembic upgrade head` on startup)

6. **Deploy frontend** — set `FRONTEND_URL` on the backend to the Railway-assigned frontend URL

7. **Railway assigns public URLs** automatically to each service

---

## Deployment — Render

`render.yaml` in the project root configures everything automatically:

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your repository — Render auto-detects `render.yaml`
4. Set **manual** environment variables:
   - `OPENAI_API_KEY` on the backend service
5. Everything else (PostgreSQL, `SECRET_KEY`, disk) is configured via `render.yaml`
6. Deploy

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login (form-encoded) |
| GET | `/api/auth/me` | Yes | Current user info |
| POST | `/api/meetings/upload` | Yes | Upload audio file |
| GET | `/api/meetings/` | Yes | List user's meetings |
| GET | `/api/meetings/{id}` | Yes | Meeting detail with all data |
| DELETE | `/api/meetings/{id}` | Yes | Delete meeting |
| GET | `/api/meetings/{id}/status` | Yes | Lightweight status poll |
| POST | `/api/meetings/{id}/regenerate` | Yes | Re-run AI processing |
| PATCH | `/api/meetings/{id}/action-items/{item_id}` | Yes | Toggle action item completed |
| GET | `/api/meetings/{id}/email` | Yes | Get email draft |
| GET | `/api/health` | No | Health check |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TailwindCSS 3, React Router 6, Axios |
| Backend | FastAPI, SQLAlchemy 2 (sync), Alembic, Pydantic v2 |
| Database | PostgreSQL 16 |
| Transcription | OpenAI Whisper (base model, local) |
| AI | OpenAI GPT-4o |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Infrastructure | Docker Compose, nginx |
| Deployment | Railway / Render |

---

## Project Structure

```
project/
├── backend/
│   ├── routers/        # auth.py, meetings.py, emails.py
│   ├── services/       # auth.py, transcription.py, ai_processing.py, storage.py
│   ├── middleware/     # auth_middleware.py
│   ├── alembic/        # Database migrations
│   ├── main.py         # FastAPI app, CORS, router registration
│   ├── database.py     # SQLAlchemy engine + session
│   ├── models.py       # ORM models (User, Meeting, Transcript, etc.)
│   ├── schemas.py      # Pydantic request/response schemas
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/        # Axios client + API functions
│   │   ├── context/    # AuthContext (JWT state management)
│   │   ├── hooks/      # usePolling, useAuth
│   │   ├── components/ # Reusable UI components
│   │   └── pages/      # Login, Register, Dashboard, MeetingPage
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── render.yaml
└── .env.example
```
