from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import SlackSettings, User
from schemas import SlackSettingsCreate, SlackSettingsResponse, SlackTestResponse
from services.auth import get_current_user
from services.slack import test_slack_webhook

router = APIRouter()


@router.get("/slack", response_model=SlackSettingsResponse)
def get_slack_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = db.query(SlackSettings).filter(SlackSettings.user_id == current_user.id).first()
    if not settings:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slack not configured")
    return settings


@router.post("/slack", response_model=SlackSettingsResponse)
def upsert_slack_settings(
    body: SlackSettingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = db.query(SlackSettings).filter(SlackSettings.user_id == current_user.id).first()
    if settings:
        settings.webhook_url = body.webhook_url
        settings.channel_name = body.channel_name
        settings.enabled = body.enabled
    else:
        settings = SlackSettings(
            user_id=current_user.id,
            webhook_url=body.webhook_url,
            channel_name=body.channel_name,
            enabled=body.enabled,
        )
        db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


@router.delete("/slack", status_code=status.HTTP_204_NO_CONTENT)
def delete_slack_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = db.query(SlackSettings).filter(SlackSettings.user_id == current_user.id).first()
    if settings:
        db.delete(settings)
        db.commit()


@router.post("/slack/test", response_model=SlackTestResponse)
def test_slack(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = db.query(SlackSettings).filter(SlackSettings.user_id == current_user.id).first()
    if not settings:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slack not configured")
    result = test_slack_webhook(settings.webhook_url)
    return SlackTestResponse(**result)
