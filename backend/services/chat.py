from sqlalchemy.orm import Session
from services.rag import semantic_search
from services.ai_processing import get_client, CHAT_MODEL

CHAT_SYSTEM_PROMPT = """You are an AI assistant with access to a user's meeting history.
Answer the user's question based ONLY on the provided meeting context.
Be concise and cite which meeting(s) your answer comes from using the meeting title.
If the context does not contain relevant information, say so honestly rather than guessing."""


def answer_query(question: str, user_id: str, db: Session) -> dict:
    sources = semantic_search(question, user_id, db, top_k=5)

    if not sources:
        return {
            "answer": "I couldn't find relevant information in your meeting history. Try uploading and processing some meetings first.",
            "sources": [],
        }

    context = "\n\n".join(
        f"[From meeting '{s['meeting_title']}' — {s['chunk_type']}]:\n{s['snippet']}"
        for s in sources
    )

    client = get_client()
    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": CHAT_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Meeting context:\n{context}\n\n"
                    f"Question: {question}\n\n"
                    "Answer based on the meeting context above. "
                    "Cite meeting names when referencing specific information."
                ),
            },
        ],
        temperature=0.3,
    )
    answer = response.choices[0].message.content.strip()

    return {
        "answer": answer,
        "sources": [
            {
                "meeting_id": s["meeting_id"],
                "meeting_title": s["meeting_title"],
                "snippet": s["snippet"],
                "chunk_type": s["chunk_type"],
            }
            for s in sources
        ],
    }
