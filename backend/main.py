import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers.auth import router as auth_router
from routers.meetings import router as meetings_router
from routers.emails import router as emails_router
from routers.action_items import router as action_items_router
from routers.settings import router as settings_router
from routers.chat import router as chat_router

upload_dir = Path(os.getenv("UPLOAD_DIR", "uploads"))
upload_dir.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="AI Meeting Assistant",
    version="1.0.0",
    description="Upload meeting recordings for automatic transcription, summarization, and action item extraction.",
)

# CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files in local dev (nginx handles this in production)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

# Routers
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(meetings_router, prefix="/api/meetings", tags=["meetings"])
app.include_router(emails_router, prefix="/api", tags=["emails"])
app.include_router(action_items_router, prefix="/api/action-items", tags=["action-items"])
app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}


@app.on_event("startup")
def startup_event():
    # Preload Whisper model to avoid cold-start delay on first upload
    try:
        from services.transcription import get_model
        get_model()
    except Exception:
        pass
    # Pre-warm sentence-transformers embedding model (~90MB download on first run)
    try:
        from services.rag import get_embedding_model
        get_embedding_model()
    except Exception:
        pass
