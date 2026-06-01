from uuid import uuid4
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, JSON, DateTime, Float, ForeignKey, Index, Integer
from sqlalchemy.orm import relationship
from database import Base

try:
    from pgvector.sqlalchemy import Vector
    _VECTOR_AVAILABLE = True
except ImportError:
    _VECTOR_AVAILABLE = False
    Vector = lambda dim: Text  # fallback for environments without pgvector


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    meetings = relationship("Meeting", back_populates="user", cascade="all, delete-orphan")
    slack_settings = relationship("SlackSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    error_message = Column(Text, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="meetings")
    transcript = relationship("Transcript", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    summary = relationship("MeetingSummary", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    follow_up_email = relationship("FollowUpEmail", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    speakers = relationship("MeetingSpeaker", back_populates="meeting", cascade="all, delete-orphan")
    segments = relationship(
        "TranscriptSegment",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="TranscriptSegment.sequence_order",
    )
    embedding_chunks = relationship("EmbeddingChunk", back_populates="meeting", cascade="all, delete-orphan")
    email_send_logs = relationship("EmailSendLog", back_populates="meeting", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_meetings_user_status", "user_id", "status"),)


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, unique=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="transcript")


class MeetingSummary(Base):
    __tablename__ = "meeting_summaries"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, unique=True)
    summary = Column(Text, nullable=False)
    key_points = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="summary")


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(Text, nullable=False)
    assignee = Column(String, nullable=True)
    due_date = Column(String, nullable=True)
    priority = Column(String, nullable=True, default="medium")
    status = Column(String, nullable=True, default="open")  # open/in_progress/done
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="action_items")


class FollowUpEmail(Base):
    __tablename__ = "follow_up_emails"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, unique=True)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    recipients = Column(JSON, nullable=False, default=list)
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="follow_up_email")


class MeetingSpeaker(Base):
    __tablename__ = "meeting_speakers"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String, nullable=False)
    name = Column(String, nullable=True)
    color = Column(String, nullable=True)

    meeting = relationship("Meeting", back_populates="speakers")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    speaker_id = Column(String, ForeignKey("meeting_speakers.id", ondelete="SET NULL"), nullable=True)
    start_time = Column(Float, nullable=True)
    end_time = Column(Float, nullable=True)
    text = Column(Text, nullable=False)
    sequence_order = Column(Integer, nullable=False, default=0)

    speaker = relationship("MeetingSpeaker")
    meeting = relationship("Meeting", back_populates="segments")

    __table_args__ = (Index("ix_transcript_segments_meeting_seq", "meeting_id", "sequence_order"),)

    @property
    def speaker_label(self):
        return self.speaker.label if self.speaker else "Unknown"

    @property
    def speaker_color(self):
        return self.speaker.color if self.speaker else None


class EmbeddingChunk(Base):
    __tablename__ = "embedding_chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(384) if _VECTOR_AVAILABLE else Text, nullable=True)
    chunk_type = Column(String, nullable=False)  # transcript/summary/action_item
    source_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="embedding_chunks")

    __table_args__ = (Index("ix_embedding_chunks_user_meeting", "user_id", "meeting_id"),)


class SlackSettings(Base):
    __tablename__ = "slack_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    webhook_url = Column(String, nullable=False)
    channel_name = Column(String, nullable=True)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="slack_settings")


class EmailSendLog(Base):
    __tablename__ = "email_send_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    sent_at = Column(DateTime, default=datetime.utcnow)
    recipients = Column(JSON, nullable=False, default=list)
    send_method = Column(String, nullable=True)
    status = Column(String, nullable=False, default="success")
    error_message = Column(Text, nullable=True)

    meeting = relationship("Meeting", back_populates="email_send_logs")
