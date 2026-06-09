ALLOWED_MODULE_KEYS = frozenset(
    {
        "office",
        "studio",
        "dashboard",
        "chat",
        "settings",
        "admin",
    },
)

ALLOWED_PAGE_TYPES = frozenset(
    {
        "workspace",
        "object_table",
        "object_plan",
        "object_card",
        "studio_object_settings",
        "chat_room",
        "dashboard",
        "users",
        "settings",
        "page",
        "library",
        "generic",
        "profile_panel",
    },
)

OFFICE_MODULE_KEYS = frozenset({"office", "dashboard", "chat", "settings"})

STUDIO_MODULE_KEYS = frozenset({"studio"})
