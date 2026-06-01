import os
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

_embedding_model = None


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        cache_dir = os.getenv("HF_HOME", "/app/.cache")
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2", cache_folder=cache_dir)
    return _embedding_model


def embed_text(text_input: str) -> list:
    model = get_embedding_model()
    return model.encode(text_input, normalize_embeddings=True).tolist()


def chunk_text(text_input: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    words = text_input.split()
    if not words:
        return []
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def ingest_meeting_embeddings(meeting_id: str, db: Session) -> None:
    from models import Meeting, EmbeddingChunk

    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return

    # Remove any existing chunks for idempotency (e.g. on regenerate)
    db.query(EmbeddingChunk).filter(EmbeddingChunk.meeting_id == meeting_id).delete()

    chunks_to_add = []

    if meeting.transcript:
        for chunk in chunk_text(meeting.transcript.text):
            chunks_to_add.append(EmbeddingChunk(
                meeting_id=meeting_id,
                user_id=meeting.user_id,
                chunk_text=chunk,
                embedding=embed_text(chunk),
                chunk_type="transcript",
                source_id=meeting.transcript.id,
            ))

    if meeting.summary:
        for chunk in chunk_text(meeting.summary.summary, chunk_size=300, overlap=30):
            chunks_to_add.append(EmbeddingChunk(
                meeting_id=meeting_id,
                user_id=meeting.user_id,
                chunk_text=chunk,
                embedding=embed_text(chunk),
                chunk_type="summary",
                source_id=meeting.summary.id,
            ))

    for item in meeting.action_items:
        item_text = item.description
        if item.assignee:
            item_text += f" (Owner: {item.assignee})"
        chunks_to_add.append(EmbeddingChunk(
            meeting_id=meeting_id,
            user_id=meeting.user_id,
            chunk_text=item_text,
            embedding=embed_text(item_text),
            chunk_type="action_item",
            source_id=item.id,
        ))

    for chunk_obj in chunks_to_add:
        db.add(chunk_obj)
    db.commit()


def semantic_search(query: str, user_id: str, db: Session, top_k: int = 5) -> list[dict]:
    from models import EmbeddingChunk, Meeting

    query_embedding = embed_text(query)

    try:
        # pgvector cosine distance operator <=>
        results = (
            db.query(
                EmbeddingChunk,
                Meeting.title.label("meeting_title"),
            )
            .join(Meeting, EmbeddingChunk.meeting_id == Meeting.id)
            .filter(EmbeddingChunk.user_id == user_id)
            .order_by(EmbeddingChunk.embedding.cosine_distance(query_embedding))
            .limit(top_k)
            .all()
        )
    except Exception:
        # Fallback: no vector search available
        return []

    return [
        {
            "meeting_id": row.EmbeddingChunk.meeting_id,
            "meeting_title": row.meeting_title,
            "snippet": row.EmbeddingChunk.chunk_text[:300],
            "chunk_type": row.EmbeddingChunk.chunk_type,
        }
        for row in results
    ]
