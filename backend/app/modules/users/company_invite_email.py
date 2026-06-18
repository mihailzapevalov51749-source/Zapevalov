"""Company provisioning invitation email."""

from __future__ import annotations

import logging
import os
import smtplib
import socket
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

from app.modules.portals.public_tenant_url import (
    resolve_company_portal_url_for_tenant,
    resolve_portal_public_base_url,
)

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM") or SMTP_USER


def build_company_welcome_email_message(
    *,
    to_email: str,
    company_name: str,
    portal_url: str,
    login: str,
    temporary_password: str,
) -> MIMEText:
    subject = "Добро пожаловать в ЯсноПро"

    body = f"""Здравствуйте!

В системе ЯсноПро для вас создана компания:

{company_name}

Ваши данные для входа:

Ссылка:
{portal_url}

Логин:
{login}

Временный пароль:
{temporary_password}

После первого входа рекомендуется сменить пароль.

С уважением,
Команда ЯсноПро
"""

    message = MIMEText(body, "plain", "utf-8")
    message["Subject"] = subject
    message["From"] = SMTP_FROM
    message["To"] = to_email
    return message


def resolve_portal_login_base_url() -> str:
    """Legacy login URL without company key (global users, password reset)."""
    return f"{resolve_portal_public_base_url()}/login"


def resolve_company_portal_url_for_tenant_id(db: Session, *, tenant_id: int) -> str:
    return resolve_company_portal_url_for_tenant(db, tenant_id)


def build_company_superadmin_appointment_email_message(
    *,
    to_email: str,
    company_name: str,
    portal_url: str,
    login: str,
    temporary_password: str,
) -> MIMEText:
    subject = f"Вы назначены суперадминистратором компании {company_name}"

    body = f"""Здравствуйте!

Вы назначены суперадминистратором компании {company_name}.

Ваши данные для входа:

Ссылка:
{portal_url}

Логин:
{login}

Временный пароль:
{temporary_password}

После первого входа рекомендуется сменить пароль.

С уважением,
Команда ЯсноПро
"""

    message = MIMEText(body, "plain", "utf-8")
    message["Subject"] = subject
    message["From"] = SMTP_FROM
    message["To"] = to_email
    return message


def send_company_superadmin_appointment_email(
    db: Session,
    *,
    to_email: str,
    company_name: str,
    tenant_id: int,
    login: str,
    temporary_password: str,
) -> bool:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD or not SMTP_FROM:
        logger.warning(
            "SMTP is not configured; company superadmin appointment email was prepared but not sent (%s)",
            to_email,
        )
        return False

    portal_url = resolve_company_portal_url_for_tenant(db, tenant_id)
    message = build_company_superadmin_appointment_email_message(
        to_email=to_email,
        company_name=company_name,
        portal_url=portal_url,
        login=login,
        temporary_password=temporary_password,
    )

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        return True
    except (
        smtplib.SMTPException,
        smtplib.SMTPAuthenticationError,
        TimeoutError,
        socket.timeout,
        ConnectionRefusedError,
        OSError,
    ):
        logger.exception(
            "Failed to send company superadmin appointment email to %s",
            to_email,
        )
        return False


def send_company_welcome_email(
    db: Session,
    *,
    to_email: str,
    company_name: str,
    tenant_id: int,
    login: str,
    temporary_password: str,
) -> bool:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD or not SMTP_FROM:
        logger.warning(
            "SMTP is not configured; company invite email was prepared but not sent (%s)",
            to_email,
        )
        return False

    portal_url = resolve_company_portal_url_for_tenant(db, tenant_id)
    message = build_company_welcome_email_message(
        to_email=to_email,
        company_name=company_name,
        portal_url=portal_url,
        login=login,
        temporary_password=temporary_password,
    )

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        return True
    except (
        smtplib.SMTPException,
        smtplib.SMTPAuthenticationError,
        TimeoutError,
        socket.timeout,
        ConnectionRefusedError,
        OSError,
    ):
        logger.exception("Failed to send company welcome email to %s", to_email)
        return False
