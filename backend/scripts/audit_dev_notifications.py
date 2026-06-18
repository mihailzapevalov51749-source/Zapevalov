"""Read-only audit of notification payloads in DEV database."""

from __future__ import annotations

import json
from collections import Counter

from app.db.session import SessionLocal
from app.modules.notifications.models import Notification, NotificationRecipient
from app.modules.users.models import User  # noqa: F401


def _classify(notification: Notification) -> str:
    entity_type = (notification.entity_type or "").strip()
    context = notification.context if isinstance(notification.context, dict) else {}
    target = context.get("target")

    if isinstance(target, dict) and target.get("type") and target.get("id"):
        return "valid_current_format"

    if entity_type == "calendar_event":
        if context.get("event_id") or notification.entity_id:
            return "legacy_calendar_repairable"
        return "broken_reference"

    if entity_type == "chat":
        if context.get("chat_id") or notification.entity_id:
            return "legacy_chat_repairable"
        return "broken_reference"

    if entity_type.startswith("universal_table"):
        return "legacy_ut_unopenable"

    if entity_type == "runtime_entity":
        ref = context.get("published_runtime_ref")
        if isinstance(ref, dict) and ref.get("object_type_key") and ref.get("runtime_entity_id"):
            return "valid_current_format"
        if notification.entity_id:
            return "legacy_runtime_partial"
        return "broken_reference"

    if entity_type == "file" or context.get("source") in {"library_file", "uploaded_file"}:
        if context.get("file_id") or notification.entity_id:
            return "legacy_file_repairable"
        return "broken_reference"

    if not entity_type and not notification.entity_id:
        return "unknown_type"

    return "legacy_unknown"


def main() -> None:
    db = SessionLocal()
    try:
        rows = (
            db.query(Notification, NotificationRecipient)
            .join(NotificationRecipient, NotificationRecipient.notification_id == Notification.id)
            .order_by(Notification.id.desc())
            .all()
        )

        counts = Counter()
        legacy_samples: list[dict] = []

        print(f"total_notification_recipients={len(rows)}")
        print("-" * 120)

        for notification, recipient in rows:
            classification = _classify(notification)
            counts[classification] += 1

            record = {
                "id": notification.id,
                "tenant_id": (notification.context or {}).get("tenant_id"),
                "portal_id": (notification.context or {}).get("portal_id"),
                "recipient_user_id": recipient.user_id,
                "type": notification.type,
                "title": notification.title,
                "entity_type": notification.entity_type,
                "entity_id": notification.entity_id,
                "target_type": (
                    (notification.context or {}).get("target", {}).get("type")
                    if isinstance((notification.context or {}).get("target"), dict)
                    else (notification.context or {}).get("target")
                ),
                "target_id": (
                    (notification.context or {}).get("target", {}).get("id")
                    if isinstance((notification.context or {}).get("target"), dict)
                    else None
                ),
                "payload": notification.context,
                "created_at": notification.created_at.isoformat() if notification.created_at else None,
                "read_at": recipient.read_at.isoformat() if recipient.read_at else None,
                "classification": classification,
            }

            if classification != "valid_current_format" and len(legacy_samples) < 20:
                legacy_samples.append(record)

            print(json.dumps(record, ensure_ascii=False, default=str))

        print("-" * 120)
        print("classification_counts=" + json.dumps(dict(counts), ensure_ascii=False))
        print("legacy_samples=" + json.dumps(legacy_samples, ensure_ascii=False, default=str))
    finally:
        db.close()


if __name__ == "__main__":
    main()
