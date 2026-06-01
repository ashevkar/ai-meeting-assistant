from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: Optional[str] = None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenWithUser(Token):
    user: UserResponse


# ─── Transcript & Speakers ───────────────────────────────────────────────────

class TranscriptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    text: str
    created_at: datetime


class SpeakerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    label: str
    name: Optional[str] = None
    color: Optional[str] = None


class TranscriptSegmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    speaker_id: Optional[str] = None
    speaker_label: Optional[str] = None
    speaker_color: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    text: str
    sequence_order: int


# ─── Summary ─────────────────────────────────────────────────────────────────

class SummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    summary: str
    key_points: List[str]
    created_at: datetime


# ─── Action Items ────────────────────────────────────────────────────────────

class ActionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: str
    description: str
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "open"
    completed: bool
    created_at: datetime


class ActionItemUpdate(BaseModel):
    completed: bool


class ActionItemFullUpdate(BaseModel):
    description: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    completed: Optional[bool] = None


# ─── Email ───────────────────────────────────────────────────────────────────

class EmailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subject: str
    body: str
    recipients: List[str]
    is_sent: bool = False
    sent_at: Optional[datetime] = None
    created_at: datetime


class EmailUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None


class EmailSendRequest(BaseModel):
    recipients: List[str]


class EmailSendResponse(BaseModel):
    sent: bool
    method: str
    message: Optional[str] = None


# ─── Meetings ────────────────────────────────────────────────────────────────

class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    filename: str
    original_filename: str
    status: str
    error_message: Optional[str] = None
    duration_seconds: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class MeetingDetailResponse(MeetingResponse):
    transcript: Optional[TranscriptResponse] = None
    summary: Optional[SummaryResponse] = None
    action_items: List[ActionItemResponse] = []
    follow_up_email: Optional[EmailResponse] = None
    segments: List[TranscriptSegmentResponse] = []
    speakers: List[SpeakerResponse] = []


class MeetingStatusResponse(BaseModel):
    id: str
    status: str
    error_message: Optional[str] = None


# ─── Chat / RAG ──────────────────────────────────────────────────────────────

class ChatQuery(BaseModel):
    question: str


class ChatSource(BaseModel):
    meeting_id: str
    meeting_title: str
    snippet: str
    chunk_type: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[ChatSource]


# ─── Slack ───────────────────────────────────────────────────────────────────

class SlackSettingsCreate(BaseModel):
    webhook_url: str
    channel_name: Optional[str] = None
    enabled: bool = True


class SlackSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    webhook_url: str
    channel_name: Optional[str] = None
    enabled: bool
    created_at: datetime
    updated_at: datetime


class SlackTestResponse(BaseModel):
    success: bool
    message: str
