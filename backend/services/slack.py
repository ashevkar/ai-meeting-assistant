import httpx
from sqlalchemy.orm import Session
from models import Meeting, SlackSettings


def _build_slack_blocks(meeting) -> list:
    summary_text = ""
    if meeting.summary:
        summary_text = meeting.summary.summary[:300]
        if len(meeting.summary.summary) > 300:
            summary_text += "…"

    action_items_text = ""
    if meeting.action_items:
        lines = []
        for item in meeting.action_items[:5]:
            line = f"• {item.description}"
            if item.assignee:
                line += f" _(owner: {item.assignee})_"
            lines.append(line)
        action_items_text = "\n".join(lines)
        if len(meeting.action_items) > 5:
            action_items_text += f"\n_...and {len(meeting.action_items) - 5} more_"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"✅ Meeting completed: {meeting.title}"},
        },
    ]

    if summary_text:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*Summary:*\n{summary_text}"},
        })

    if action_items_text:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*Action Items:*\n{action_items_text}"},
        })

    blocks.append({"type": "divider"})
    return blocks


def send_slack_notification(meeting_id: str, user_id: str, db: Session) -> dict:
    settings = (
        db.query(SlackSettings)
        .filter(SlackSettings.user_id == user_id, SlackSettings.enabled.is_(True))
        .first()
    )
    if not settings:
        return {"sent": False, "reason": "no_settings"}

    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return {"sent": False, "reason": "meeting_not_found"}

    blocks = _build_slack_blocks(meeting)
    payload = {"blocks": blocks, "text": f"Meeting completed: {meeting.title}"}

    response = httpx.post(settings.webhook_url, json=payload, timeout=10)
    response.raise_for_status()
    return {"sent": True}


def test_slack_webhook(webhook_url: str) -> dict:
    payload = {
        "text": "✅ MeetingAI test notification — your Slack integration is working!",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "✅ *MeetingAI test notification*\nYour Slack integration is working correctly.",
                },
            }
        ],
    }
    try:
        response = httpx.post(webhook_url, json=payload, timeout=10)
        response.raise_for_status()
        return {"success": True, "message": "Test notification sent successfully"}
    except httpx.HTTPStatusError as e:
        return {"success": False, "message": f"Slack returned {e.response.status_code}: {e.response.text}"}
    except Exception as e:
        return {"success": False, "message": str(e)}
