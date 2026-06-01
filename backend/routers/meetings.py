from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from database import SessionLocal, get_db
from models import (
    ActionItem, EmbeddingChunk, FollowUpEmail, Meeting, MeetingSpeaker,
    MeetingSummary, Transcript, TranscriptSegment, User,
)
from schemas import (
    ActionItemResponse,
    ActionItemUpdate,
    ActionItemFullUpdate,
    MeetingDetailResponse,
    MeetingResponse,
    MeetingStatusResponse,
)
from services.ai_processing import (
    generate_action_items, generate_email_draft, generate_summary, detect_speakers,
)
from services.auth import get_current_user
from services.storage import delete_file, save_upload_file, validate_audio_file
from services.transcription import transcribe
from services.youtube import download_youtube_audio

router = APIRouter()

SPEAKER_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]


def process_meeting(meeting_id: str) -> None:
    """Background task — runs in its own thread with its own DB session."""
    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            return

        meeting.status = "processing"
        meeting.updated_at = datetime.utcnow()
        db.commit()

        # Step 1: Transcribe audio (skip if transcript already exists from prior run)
        existing_transcript = db.query(Transcript).filter(Transcript.meeting_id == meeting_id).first()
        if existing_transcript:
            text = existing_transcript.text
        else:
            text = transcribe(meeting.file_path)
            transcript = Transcript(meeting_id=meeting_id, text=text)
            db.add(transcript)
            db.commit()

        # Step 1.5: Speaker diarization (LLM-based)
        existing_segments = db.query(TranscriptSegment).filter(
            TranscriptSegment.meeting_id == meeting_id
        ).first()
        if not existing_segments:
            diarization = detect_speakers(text)
            if diarization["speakers"] and diarization["segments"]:
                speaker_map = {}
                for i, label in enumerate(diarization["speakers"]):
                    speaker = MeetingSpeaker(
                        meeting_id=meeting_id,
                        label=label,
                        color=SPEAKER_COLORS[i % len(SPEAKER_COLORS)],
                    )
                    db.add(speaker)
                    db.flush()
                    speaker_map[label] = speaker.id

                for seg in diarization["segments"]:
                    db.add(TranscriptSegment(
                        meeting_id=meeting_id,
                        speaker_id=speaker_map.get(seg["speaker"]),
                        text=seg["text"],
                        sequence_order=seg["sequence"],
                    ))
                db.commit()

        # Step 2: Generate summary
        summary_data = generate_summary(text)
        summary = MeetingSummary(
            meeting_id=meeting_id,
            summary=summary_data["summary"],
            key_points=summary_data["key_points"],
        )
        db.add(summary)
        db.commit()

        # Step 3: Extract action items
        items_data = generate_action_items(text)
        for item in items_data:
            db.add(ActionItem(meeting_id=meeting_id, **item))
        db.commit()

        # Step 4: Draft follow-up email
        email_data = generate_email_draft(text, summary_data["summary"], items_data)
        email = FollowUpEmail(
            meeting_id=meeting_id,
            subject=email_data["subject"],
            body=email_data["body"],
            recipients=[],
        )
        db.add(email)

        meeting.status = "completed"
        meeting.updated_at = datetime.utcnow()
        db.commit()

        # Step 5: Slack notification (non-fatal)
        try:
            from services.slack import send_slack_notification
            send_slack_notification(meeting_id, meeting.user_id, db)
        except Exception:
            pass

        # Step 6: Ingest embeddings for RAG (non-fatal)
        try:
            from services.rag import ingest_meeting_embeddings
            ingest_meeting_embeddings(meeting_id, db)
        except Exception:
            pass

    except Exception as exc:
        try:
            db.rollback()
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if meeting:
                meeting.status = "failed"
                meeting.error_message = str(exc)
                meeting.updated_at = datetime.utcnow()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/upload", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def upload_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_audio_file(file)
    stored_name, abs_path = save_upload_file(file)

    meeting = Meeting(
        user_id=current_user.id,
        title=title,
        filename=stored_name,
        original_filename=file.filename,
        file_path=abs_path,
        status="pending",
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    background_tasks.add_task(process_meeting, meeting.id)
    return meeting


@router.post("/upload-url", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
def upload_meeting_from_url(
    background_tasks: BackgroundTasks,
    url: str = Form(...),
    title: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stored_name, abs_path = download_youtube_audio(url)

    meeting = Meeting(
        user_id=current_user.id,
        title=title,
        filename=stored_name,
        original_filename=url,
        file_path=abs_path,
        status="pending",
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    background_tasks.add_task(process_meeting, meeting.id)
    return meeting


@router.get("/", response_model=List[MeetingResponse])
def list_meetings(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Meeting)
        .filter(Meeting.user_id == current_user.id)
        .order_by(Meeting.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{meeting_id}", response_model=MeetingDetailResponse)
def get_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return meeting


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    delete_file(meeting.file_path)
    db.delete(meeting)
    db.commit()


@router.get("/{meeting_id}/status", response_model=MeetingStatusResponse)
def get_meeting_status(
    meeting_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return MeetingStatusResponse(id=meeting.id, status=meeting.status, error_message=meeting.error_message)


@router.post("/{meeting_id}/regenerate", response_model=MeetingResponse)
def regenerate_meeting(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    if meeting.status in ("pending", "processing"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Meeting is already being processed")

    # Clear all AI-generated data (keep transcript for re-use)
    if meeting.summary:
        db.delete(meeting.summary)
    for item in list(meeting.action_items):
        db.delete(item)
    if meeting.follow_up_email:
        db.delete(meeting.follow_up_email)
    for seg in list(meeting.segments):
        db.delete(seg)
    for spk in list(meeting.speakers):
        db.delete(spk)
    db.query(EmbeddingChunk).filter(EmbeddingChunk.meeting_id == meeting_id).delete()

    meeting.status = "pending"
    meeting.error_message = None
    meeting.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(meeting)

    background_tasks.add_task(process_meeting, meeting.id)
    return meeting


@router.patch("/{meeting_id}/action-items/{item_id}", response_model=ActionItemResponse)
def update_action_item(
    meeting_id: str,
    item_id: str,
    body: ActionItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    item = (
        db.query(ActionItem)
        .filter(ActionItem.id == item_id, ActionItem.meeting_id == meeting_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found")

    item.completed = body.completed
    db.commit()
    db.refresh(item)
    return item


@router.put("/{meeting_id}/action-items/{item_id}", response_model=ActionItemResponse)
def update_action_item_full(
    meeting_id: str,
    item_id: str,
    body: ActionItemFullUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = (
        db.query(Meeting)
        .filter(Meeting.id == meeting_id, Meeting.user_id == current_user.id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    item = (
        db.query(ActionItem)
        .filter(ActionItem.id == item_id, ActionItem.meeting_id == meeting_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action item not found")

    if body.description is not None:
        item.description = body.description
    if body.assignee is not None:
        item.assignee = body.assignee
    if body.due_date is not None:
        item.due_date = body.due_date
    if body.priority is not None:
        item.priority = body.priority
    if body.status is not None:
        item.status = body.status
    if body.completed is not None:
        item.completed = body.completed

    db.commit()
    db.refresh(item)
    return item
