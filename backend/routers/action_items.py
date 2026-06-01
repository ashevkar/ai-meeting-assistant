from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import ActionItem, Meeting, User
from schemas import ActionItemResponse
from services.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ActionItemResponse])
def get_all_action_items(
    assignee: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    meeting_id: Optional[str] = Query(None),
    completed: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Join through Meeting to enforce user ownership
    q = (
        db.query(ActionItem)
        .join(Meeting, ActionItem.meeting_id == Meeting.id)
        .filter(Meeting.user_id == current_user.id)
    )

    if assignee:
        q = q.filter(ActionItem.assignee.ilike(f"%{assignee}%"))
    if status:
        q = q.filter(ActionItem.status == status)
    if priority:
        q = q.filter(ActionItem.priority == priority)
    if meeting_id:
        q = q.filter(ActionItem.meeting_id == meeting_id)
    if completed is not None:
        q = q.filter(ActionItem.completed == completed)

    return q.order_by(ActionItem.created_at.desc()).offset(skip).limit(limit).all()
