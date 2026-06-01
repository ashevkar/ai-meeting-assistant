import os
import re
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))

YOUTUBE_PATTERN = re.compile(
    r"(https?://)?(www\.)?"
    r"(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)"
    r"[\w\-]+"
)


def validate_youtube_url(url: str) -> None:
    if not YOUTUBE_PATTERN.search(url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid YouTube URL",
        )


def download_youtube_audio(url: str) -> tuple[str, str]:
    """Download audio from a YouTube URL. Returns (stored_name, abs_path)."""
    import yt_dlp

    validate_youtube_url(url)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid4()}.mp3"
    abs_path = str(UPLOAD_DIR / stored_name)

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": abs_path.replace(".mp3", ".%(ext)s"),
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "128",
            }
        ],
        "quiet": True,
        "no_warnings": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        Path(abs_path).unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to download YouTube audio: {str(e)}",
        )

    if not Path(abs_path).exists():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Audio download succeeded but output file not found",
        )

    if Path(abs_path).stat().st_size < 1024:
        Path(abs_path).unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Downloaded audio file is empty. The video may have no audio track.",
        )

    return stored_name, abs_path
