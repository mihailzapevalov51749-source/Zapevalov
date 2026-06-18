"""Repair legacy calendar/chat notification contexts (dry-run by default)."""

from __future__ import annotations

import argparse
import json

from app.db.session import SessionLocal
from app.modules.notifications.models import Notification
from app.modules.users.models import User  # noqa: F401
from app.modules.notifications.target_context import (
    build_notification_target,
    merge_notification_context,
)


def _needs_repair(notification: Notification) -> bool:
    context = notification.context if isinstance(notification.context, dict) else {}
    target = context.get("target")
    if isinstance(target, dict) and target.get("type") and target.get("id"):
        return False

    entity_type = (notification.entity_type or "").strip()
    if entity_type == "calendar_event":
        return bool(context.get("event_id") or notification.entity_id)
    if entity_type == "chat":
        return bool(context.get("chat_id") or notification.entity_id)
    return False


def _build_repaired_context(notification: Notification) -> dict | None:
    context = dict(notification.context or {})
    entity_type = (notification.entity_type or "").strip()
    entity_id = notification.entity_id or context.get("entity_id")

    if entity_type == "calendar_event":
        event_id = context.get("event_id") or entity_id
        tenant_id = context.get("tenant_id") or context.get("portal_id")
        if not event_id or not tenant_id:
            return None

        target = build_notification_target(
            target_type="calendar_event",
            target_id=event_id,
            tenant_id=int(tenant_id),
            portal_id=int(context.get("portal_id") or tenant_id),
            runtime="runtime.calendar",
            action="open",
        )
        return merge_notification_context(
            tenant_id=int(tenant_id),
            portal_id=int(context.get("portal_id") or tenant_id),
            entity_type="calendar_event",
            entity_id=event_id,
            target=target,
            extra={
                "event_id": event_id,
                "tab": context.get("tab") or "calendar",
            },
        )

    if entity_type == "chat":
        chat_id = context.get("chat_id") or entity_id
        tenant_id = context.get("tenant_id") or context.get("portal_id")
        if not chat_id:
            return None

        extra = {
            key: context[key]
            for key in ("chat_id", "message_id", "highlight_id", "tab", "parent_message_id")
            if key in context
        }
        if "chat_id" not in extra:
            extra["chat_id"] = chat_id
        if "tab" not in extra:
            extra["tab"] = "chat"

        if tenant_id:
            target = build_notification_target(
                target_type="chat",
                target_id=chat_id,
                tenant_id=int(tenant_id),
                portal_id=int(context.get("portal_id") or tenant_id),
                runtime="runtime.chat",
                action="open",
            )
            return merge_notification_context(
                tenant_id=int(tenant_id),
                portal_id=int(context.get("portal_id") or tenant_id),
                entity_type="chat",
                entity_id=chat_id,
                target=target,
                extra=extra,
            )

        return {
            "entity_type": "chat",
            "entity_id": str(chat_id),
            **extra,
        }

    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Persist repaired contexts")
    args = parser.parse_args()

    db = SessionLocal()
    repaired = 0
    skipped = 0
    plan: list[dict] = []

    try:
        notifications = db.query(Notification).order_by(Notification.id.asc()).all()

        for notification in notifications:
            if not _needs_repair(notification):
                continue

            next_context = _build_repaired_context(notification)
            if not next_context:
                skipped += 1
                plan.append(
                    {
                        "id": notification.id,
                        "status": "unrecoverable",
                        "entity_type": notification.entity_type,
                        "context": notification.context,
                    }
                )
                continue

            plan.append(
                {
                    "id": notification.id,
                    "status": "repairable",
                    "before": notification.context,
                    "after": next_context,
                }
            )

            if args.apply:
                notification.context = next_context
                repaired += 1

        if args.apply:
            db.commit()

        print(
            json.dumps(
                {
                    "apply": args.apply,
                    "repairable": sum(1 for item in plan if item["status"] == "repairable"),
                    "unrecoverable": sum(1 for item in plan if item["status"] == "unrecoverable"),
                    "repaired": repaired,
                    "plan": plan,
                },
                ensure_ascii=False,
                default=str,
                indent=2,
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
