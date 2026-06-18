"""Seed catalog for platform module manifests."""

from __future__ import annotations

from typing import Any, TypedDict

from app.modules.platform_modules.settings_schema.registry import (
    get_module_settings_schema,
)


class PlatformModuleManifestStatus:
    DRAFT = "draft"
    ACTIVE = "active"
    DEPRECATED = "deprecated"


DEFAULT_MANIFEST_VERSION = "1.0.0"


class PlatformModuleManifestSeedItem(TypedDict):
    module_key: str
    manifest_version: str
    module_version: str
    frontend_components: list[str]
    frontend_routes: list[str]
    backend_routers: list[str]
    backend_services: list[str]
    backend_models: list[str]
    db_tables: list[str]
    entry_points: list[dict[str, Any]]
    permissions: list[str]
    dependencies: list[str]
    notification_targets: list[str]
    settings_schema: dict[str, Any]
    release_notes: str | None
    status: str


PLATFORM_MODULE_MANIFEST_SEED: list[PlatformModuleManifestSeedItem] = [
    {
        "module_key": "runtime.chat",
        "manifest_version": DEFAULT_MANIFEST_VERSION,
        "module_version": "1.0.0",
        "frontend_components": [
            "modules/chats/pages/CorporateChatPage",
            "modules/chats/components/*",
            "modules/chats/context/ChatUnreadProvider",
        ],
        "frontend_routes": [
            "portal/resolveCorporateChatPage",
            "portal/PortalPageView (runtime.chat intercept)",
        ],
        "backend_routers": [
            "app.modules.chats.router",
        ],
        "backend_services": [
            "app.modules.chats.service",
            "app.modules.chats.crud",
            "app.modules.chats.tenant_access",
        ],
        "backend_models": [
            "app.modules.chats.models.Chat",
            "app.modules.chats.models.ChatMessage",
            "app.modules.chats.models.ChatParticipant",
            "app.modules.chats.models.ChatMessageAttachment",
            "app.modules.chats.models.ChatMessageReaction",
            "app.modules.chats.models.ChatMessageMention",
        ],
        "db_tables": [
            "chats",
            "chat_participants",
            "chat_messages",
            "chat_message_attachments",
            "chat_message_reactions",
            "chat_message_mentions",
        ],
        "entry_points": [
            {
                "type": "navigation",
                "system_key": "runtime.chat",
            },
        ],
        "permissions": [
            "chats.tenant_access",
            "chats.ensure_chat_admin",
        ],
        "dependencies": [
            "runtime.notifications",
            "platform.users",
            "platform.files",
        ],
        "notification_targets": [
            "chat_mention",
            "chat_reply",
        ],
        "settings_schema": get_module_settings_schema("runtime.chat") or {},
        "release_notes": "Initial manifest for corporate chat runtime module.",
        "status": PlatformModuleManifestStatus.ACTIVE,
    },
    {
        "module_key": "runtime.calendar",
        "manifest_version": DEFAULT_MANIFEST_VERSION,
        "module_version": "1.0.0",
        "frontend_components": [
            "modules/calendar/pages/CorporateCalendarPage",
            "modules/calendar/components/*",
            "modules/calendar/api/calendarApi",
        ],
        "frontend_routes": [
            "portal/resolveCorporateCalendarPage",
            "portal/PortalPageView (runtime.calendar intercept)",
        ],
        "backend_routers": [
            "app.modules.calendar.router",
        ],
        "backend_services": [
            "app.modules.calendar.service",
            "app.modules.calendar.crud",
            "app.modules.calendar.tenant_access",
        ],
        "backend_models": [
            "app.modules.calendar.models.CalendarEvent",
            "app.modules.calendar.models.CalendarEventParticipant",
        ],
        "db_tables": [
            "calendar_events",
            "calendar_event_participants",
        ],
        "entry_points": [
            {
                "type": "navigation",
                "system_key": "runtime.calendar",
            },
        ],
        "permissions": [
            "calendar.tenant_access",
            "calendar.event_edit_role",
        ],
        "dependencies": [
            "runtime.notifications",
            "runtime.chat",
            "platform.users",
        ],
        "notification_targets": [
            "calendar_event_invite",
        ],
        "settings_schema": get_module_settings_schema("runtime.calendar") or {},
        "release_notes": "Initial manifest for corporate calendar runtime module.",
        "status": PlatformModuleManifestStatus.ACTIVE,
    },
    {
        "module_key": "runtime.notifications",
        "manifest_version": DEFAULT_MANIFEST_VERSION,
        "module_version": "1.0.0",
        "frontend_components": [
            "modules/notifications/components/NotificationBell",
            "modules/notifications/components/NotificationOverlayHost",
            "modules/notifications/hooks/useNotificationNavigationOrchestrator",
            "modules/notifications/navigation/*",
        ],
        "frontend_routes": [
            "layouts/PortalLayout (overlay host)",
            "portal/resolveRuntimeNavigationPageId",
        ],
        "backend_routers": [
            "app.modules.notifications.router",
        ],
        "backend_services": [
            "app.modules.notifications.service",
            "app.modules.notifications.target_context",
            "app.modules.notifications.tenant_access",
        ],
        "backend_models": [
            "app.modules.notifications.models.Notification",
            "app.modules.notifications.models.NotificationRecipient",
        ],
        "db_tables": [
            "notifications",
            "notification_recipients",
        ],
        "entry_points": [
            {
                "type": "navigation",
                "system_key": "runtime.notifications",
            },
            {
                "type": "overlay",
                "host": "PortalLayout",
            },
        ],
        "permissions": [
            "notifications.read",
            "notifications.tenant_access",
        ],
        "dependencies": [
            "platform.users",
            "platform.navigation",
        ],
        "notification_targets": [
            "chat_mention",
            "chat_reply",
            "calendar_event_invite",
            "comment_mention",
            "note_mention",
            "library_file",
            "runtime_entity_card",
        ],
        "settings_schema": get_module_settings_schema("runtime.notifications") or {},
        "release_notes": "Initial manifest for notifications platform service.",
        "status": PlatformModuleManifestStatus.ACTIVE,
    },
]
