"""Company provisioning invitation email."""

from __future__ import annotations

import logging
import os
import smtplib
import socket
from email.mime.text import MIMEText
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

logger = logging.getLogger(__name__)

DEFAULT_PORTAL_LOGIN_URL = "http://localhost:5173/login"

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
    return str(os.getenv("PORTAL_LOGIN_URL", DEFAULT_PORTAL_LOGIN_URL) or "").strip()


def resolve_company_portal_url(*, tenant_id: int) -> str:
    """Login URL scoped to the provisioned tenant (MVP: tenantId query param)."""
    base = resolve_portal_login_base_url().rstrip("/")
    if not base:
        return f"/login?tenantId={tenant_id}"

    if "{tenant_id}" in base:
        base = base.replace("{tenant_id}", str(tenant_id))

    parsed = urlparse(base)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["tenantId"] = str(tenant_id)
    return urlunparse(parsed._replace(query=urlencode(query)))


def send_company_welcome_email(
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

    portal_url = resolve_company_portal_url(tenant_id=tenant_id)
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
