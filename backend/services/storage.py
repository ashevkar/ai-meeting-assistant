import os
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile, HTTPException, status

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
ALLOWED_EXTENSIONS = {".mp3", ".mp4", ".wav", ".m4a", ".ogg", ".flac", ".webm"}
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "500"))


def ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def validate_audio_file(file: UploadFile) -> None:
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )


def save_upload_file(file: UploadFile) -> tuple[str, str]:
    ensure_upload_dir()
    ext = Path(file.filename).suffix.lower()
    stored_name = f"{uuid4()}{ext}"
    abs_path = str(UPLOAD_DIR / stored_name)

    file.file.seek(0)
    with open(abs_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Check size after writing
    size_mb = os.path.getsize(abs_path) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        Path(abs_path).unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE_MB}MB",
        )

    return stored_name, abs_path


def delete_file(file_path: str) -> None:
    try:
        Path(file_path).unlink(missing_ok=True)
    except Exception:
        pass
