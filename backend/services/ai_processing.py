import json
import os
from typing import Any

from openai import OpenAI

_client = None

# Model is configurable — defaults to gpt-4o for OpenAI, set OPENAI_MODEL for other providers
# e.g. OPENAI_MODEL=llama-3.3-70b-versatile for Groq
CHAT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


def get_client() -> OpenAI:
    global _client
    if _client is None:
        # OPENAI_BASE_URL env var is read automatically by the SDK
        # e.g. https://api.groq.com/openai/v1 for Groq
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


SUMMARY_SYSTEM_PROMPT = """You are an expert meeting analyst. Analyze the meeting transcript and return a JSON object with:
- "summary": A concise executive summary of the meeting (3-5 sentences)
- "key_points": An array of 5-7 key discussion points as strings

Return only valid JSON with these exact keys."""

ACTION_ITEMS_SYSTEM_PROMPT = """You are an expert at extracting action items from meeting transcripts.
Extract all action items from the transcript and return a JSON object with:
- "action_items": An array of objects, each containing:
  - "description": What needs to be done (string)
  - "assignee": Who is responsible (string or null if unclear)
  - "due_date": Deadline in YYYY-MM-DD format (string or null if not mentioned)
  - "priority": "high", "medium", or "low" based on urgency language

Return only valid JSON with the "action_items" array."""

EMAIL_SYSTEM_PROMPT = """You are an expert at writing professional business emails.
Write a professional follow-up email for this meeting and return a JSON object with:
- "subject": A concise, professional email subject line (string)
- "body": The complete email body including: brief meeting recap, action items with owners, next steps, and professional closing (string)

Return only valid JSON with these exact keys."""


def _chat_json(system_prompt: str, user_content: str) -> Any:
    client = get_client()
    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    return json.loads(response.choices[0].message.content)


def generate_summary(transcript_text: str) -> dict:
    result = _chat_json(
        SUMMARY_SYSTEM_PROMPT,
        f"Meeting transcript:\n\n{transcript_text}",
    )
    return {
        "summary": result.get("summary", ""),
        "key_points": result.get("key_points", []),
    }


def generate_action_items(transcript_text: str) -> list[dict]:
    result = _chat_json(
        ACTION_ITEMS_SYSTEM_PROMPT,
        f"Meeting transcript:\n\n{transcript_text}",
    )
    items = result.get("action_items", [])
    validated = []
    for item in items:
        validated.append({
            "description": item.get("description", ""),
            "assignee": item.get("assignee") or None,
            "due_date": item.get("due_date") or None,
            "priority": item.get("priority", "medium") or "medium",
        })
    return validated


DIARIZATION_SYSTEM_PROMPT = """You are an expert at analyzing meeting transcripts.
Parse the transcript and identify distinct speakers. Return a JSON object with:
- "speakers": An array of unique speaker labels found (e.g. ["Speaker 1", "Speaker 2"])
- "segments": An array of objects, each containing:
  - "speaker": Speaker label string (must exactly match one label in the "speakers" array)
  - "text": The spoken text for this segment
  - "sequence": Zero-based integer sequence number

Keep consecutive speech from the same speaker as a single segment unless there is a clear topic change.
If you cannot identify distinct speakers, return a single speaker "Speaker 1".
Return only valid JSON."""


def detect_speakers(transcript_text: str) -> dict:
    try:
        result = _chat_json(
            DIARIZATION_SYSTEM_PROMPT,
            f"Meeting transcript:\n\n{transcript_text}",
        )
        speakers = result.get("speakers", [])
        raw_segments = result.get("segments", [])

        if not speakers or not raw_segments:
            return {"speakers": [], "segments": []}

        # Normalize speaker labels to title-case and ensure consistency
        speaker_set = {s.strip() for s in speakers}
        validated_segments = []
        for i, seg in enumerate(raw_segments):
            speaker = seg.get("speaker", "Speaker 1").strip()
            if speaker not in speaker_set:
                # Find closest match or default
                speaker = speakers[0] if speakers else "Speaker 1"
            validated_segments.append({
                "speaker": speaker,
                "text": str(seg.get("text", "")).strip(),
                "sequence": int(seg.get("sequence", i)),
            })

        return {"speakers": list(speaker_set), "segments": validated_segments}
    except Exception:
        return {"speakers": [], "segments": []}


def generate_email_draft(transcript_text: str, summary: str, action_items: list[dict]) -> dict:
    action_items_text = "\n".join(
        f"- {item['description']}"
        + (f" (Owner: {item['assignee']})" if item.get("assignee") else "")
        + (f" (Due: {item['due_date']})" if item.get("due_date") else "")
        for item in action_items
    )
    user_content = (
        f"Meeting summary:\n{summary}\n\n"
        f"Action items:\n{action_items_text or 'No specific action items identified.'}\n\n"
        f"Full transcript:\n{transcript_text[:3000]}"
    )
    result = _chat_json(EMAIL_SYSTEM_PROMPT, user_content)
    return {
        "subject": result.get("subject", "Meeting Follow-up"),
        "body": result.get("body", ""),
    }
