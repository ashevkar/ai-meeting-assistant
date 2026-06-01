from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting, FollowUpEmail, User
from schemas import EmailResponse, EmailUpdate, EmailSendRequest, EmailSendResponse
from services.auth import get_current_user

router = APIRouter()


def _get_meeting_owned(meeting_id: str, current_user: User, db: Session) -> Meeting:
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return meeting


@router.get("/meetings/{meeting_id}/email", response_model=EmailResponse)
def get_email(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = _get_meeting_owned(meeting_id, current_user, db)
    if not meeting.follow_up_email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email draft not ready yet")
    return meeting.follow_up_email


@router.put("/meetings/{meeting_id}/email", response_model=EmailResponse)
def update_email(
    meeting_id: str,
    body: EmailUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = _get_meeting_owned(meeting_id, current_user, db)
    if not meeting.follow_up_email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email draft not ready yet")

    email = meeting.follow_up_email
    if body.subject is not None:
        email.subject = body.subject
    if body.body is not None:
        email.body = body.body
    db.commit()
    db.refresh(email)
    return email


@router.post("/meetings/{meeting_id}/email/send", response_model=EmailSendResponse)
def send_email(
    meeting_id: str,
    body: EmailSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_meeting_owned(meeting_id, current_user, db)
    if not body.recipients:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one recipient required")

    try:
        from services.email_sender import send_email as _send_email
        result = _send_email(meeting_id, body.recipients, db)
        return EmailSendResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Send failed: {str(e)}")
