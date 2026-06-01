import os
import subprocess

_model = None


def get_model():
    global _model
    if _model is None:
        import whisper
        model_name = os.getenv("WHISPER_MODEL", "base")
        _model = whisper.load_model(model_name)
    return _model


def _get_audio_duration(file_path: str) -> float:
    """Return audio duration in seconds using ffprobe, or 0 on failure."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file_path,
            ],
            capture_output=True, text=True, timeout=30,
        )
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def transcribe(file_path: str) -> str:
    duration = _get_audio_duration(file_path)
    if duration < 0.5:
        raise ValueError(
            f"Audio file is too short or empty (duration: {duration:.2f}s). "
            "Please provide a recording with audible speech."
        )

    model = get_model()
    result = model.transcribe(file_path, fp16=False)
    text = result["text"].strip()
    if not text:
        raise ValueError("Whisper produced no transcript. The audio may be silent or contain no speech.")
    return text
