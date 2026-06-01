from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import ChatQuery, ChatResponse
from services.auth import get_current_user

router = APIRouter()


@router.post("/query", response_model=ChatResponse)
def chat_query(
    body: ChatQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.question.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty")
    try:
        from services.chat import answer_query
        result = answer_query(body.question, current_user.id, db)
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Query failed: {str(e)}")
