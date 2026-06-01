import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from sqlalchemy.orm import Session
from models import FollowUpEmail, EmailSendLog


def send_via_sendgrid(
    subject: str, body: str, from_email: str, recipients: list[str], api_key: str
) -> dict:
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, To

        sg = sendgrid.SendGridAPIClient(api_key=api_key)
        message = Mail(
            from_email=from_email,
            to_emails=[To(r) for r in recipients],
            subject=subject,
            plain_text_content=body,
        )
        response = sg.send(message)
        if response.status_code in (200, 202):
            return {"success": True, "method": "sendgrid", "error": None}
        return {"success": False, "method": "sendgrid", "error": f"Status {response.status_code}"}
    except Exception as e:
        return {"success": False, "method": "sendgrid", "error": str(e)}


def send_via_smtp(
    subject: str, body: str, from_email: str, recipients: list[str], smtp_config: dict
) -> dict:
    try:
        msg = MIMEMultipart()
        msg["From"] = from_email
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(smtp_config["host"], int(smtp_config["port"])) as server:
            server.ehlo()
            server.starttls()
            if smtp_config.get("user") and smtp_config.get("password"):
                server.login(smtp_config["user"], smtp_config["password"])
            server.sendmail(from_email, recipients, msg.as_string())

        return {"success": True, "method": "smtp", "error": None}
    except Exception as e:
        return {"success": False, "method": "smtp", "error": str(e)}


def send_email(meeting_id: str, recipients: list[str], db: Session) -> dict:
    email = db.query(FollowUpEmail).filter(FollowUpEmail.meeting_id == meeting_id).first()
    if not email:
        raise ValueError("No email draft found for this meeting")

    from_email = os.getenv("FROM_EMAIL", "")
    sendgrid_key = os.getenv("SENDGRID_API_KEY", "")
    smtp_host = os.getenv("SMTP_HOST", "")

    result: dict = {}
    if sendgrid_key and from_email:
        result = send_via_sendgrid(email.subject, email.body, from_email, recipients, sendgrid_key)
    elif smtp_host and from_email:
        smtp_config = {
            "host": smtp_host,
            "port": os.getenv("SMTP_PORT", "587"),
            "user": os.getenv("SMTP_USER", ""),
            "password": os.getenv("SMTP_PASS", ""),
        }
        result = send_via_smtp(email.subject, email.body, from_email, recipients, smtp_config)
    else:
        return {"sent": False, "method": "none", "message": "No email provider configured. Set SENDGRID_API_KEY or SMTP_HOST + FROM_EMAIL in .env"}

    log = EmailSendLog(
        meeting_id=meeting_id,
        recipients=recipients,
        send_method=result.get("method"),
        status="success" if result.get("success") else "failed",
        error_message=result.get("error"),
    )
    db.add(log)

    if result.get("success"):
        email.is_sent = True
        email.sent_at = datetime.utcnow()

    db.commit()
    return {
        "sent": result.get("success", False),
        "method": result.get("method", "none"),
        "message": result.get("error") if not result.get("success") else "Email sent successfully",
    }
