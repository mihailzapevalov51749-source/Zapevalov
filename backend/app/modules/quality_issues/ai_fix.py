from datetime import datetime

from sqlalchemy.orm import Session

from app.modules.quality_issues.constants import (
    QualityIssueAiFixStatus,
    QualityIssueStatus,
)
from app.modules.quality_issues.models import QualityIssue

AREA_LABELS_RU = {
    "navigation": "Навигация",
    "cards": "Карточки",
    "views": "Представления",
    "publish": "Публикация",
    "notifications": "Уведомления",
    "access": "Права доступа",
    "architecture": "Архитектура",
    "other": "Другое",
}


def build_user_fix_plan(issue: QualityIssue) -> str:
    expected_behavior = issue.expected_behavior or "ожидаемое поведение не указано"
    area_label = AREA_LABELS_RU.get(issue.area, issue.area)

    return (
        f"Проблема:\n"
        f"{issue.title}\n\n"
        f"Что изменится:\n"
        f"Система должна работать согласно ожидаемому поведению: {expected_behavior}\n\n"
        f"Что может быть затронуто:\n"
        f"Будет проверена область: {area_label}\n\n"
        f"Как проверить:\n"
        f"1. Повторить сценарий, где проблема проявлялась.\n"
        f"2. Убедиться, что текущее нежелательное поведение больше не возникает.\n"
        f"3. Проверить, что ожидаемое поведение выполняется стабильно."
    )


def build_technical_fix_plan(issue: QualityIssue) -> str:
    current_behavior = issue.current_behavior or issue.description or "не указано"
    expected_behavior = issue.expected_behavior or "не указано"
    area_label = AREA_LABELS_RU.get(issue.area, issue.area)
    comment = issue.comment or "—"

    return (
        f"Проблема:\n"
        f"{issue.title}\n\n"
        f"Текущее поведение:\n"
        f"{current_behavior}\n\n"
        f"Ожидаемое поведение:\n"
        f"{expected_behavior}\n\n"
        f"Область:\n"
        f"{area_label}\n\n"
        f"Комментарий:\n"
        f"{comment}\n\n"
        f"Что проверить:\n"
        f"1. Найти компоненты, связанные с указанной областью.\n"
        f"2. Найти место, где формируется текущее поведение.\n"
        f"3. Проверить, нет ли регрессий в соседних сценариях.\n\n"
        f"Ограничения:\n"
        f"- Не менять unrelated modules.\n"
        f"- Перед изменениями определить минимальный scope.\n"
        f"- После исправления дать отчет.\n\n"
        f"Definition of Done:\n"
        f"- Причина найдена.\n"
        f"- Поведение исправлено.\n"
        f"- Пользовательский сценарий проходит.\n"
        f"- Проблема переведена на проверку."
    )


def prepare_quality_issue_fix(db: Session, *, issue: QualityIssue) -> QualityIssue:
    issue.ai_fix_user_plan = build_user_fix_plan(issue)
    issue.ai_fix_technical_plan = build_technical_fix_plan(issue)
    issue.ai_fix_status = QualityIssueAiFixStatus.PLAN_READY.value
    issue.ai_fix_created_at = datetime.utcnow()

    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


def approve_quality_issue_fix(db: Session, *, issue: QualityIssue) -> QualityIssue:
    if not issue.ai_fix_user_plan:
        issue.ai_fix_user_plan = build_user_fix_plan(issue)
        issue.ai_fix_technical_plan = build_technical_fix_plan(issue)
        if not issue.ai_fix_created_at:
            issue.ai_fix_created_at = datetime.utcnow()

    issue.ai_fix_status = QualityIssueAiFixStatus.APPROVED.value
    issue.ai_fix_approved_at = datetime.utcnow()
    issue.status = QualityIssueStatus.IN_PROGRESS.value
    issue.closed_at = None

    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue
