from __future__ import annotations

import os

BOOTSTRAP_OWNER_EMAIL = "bootstrap@yasnopro.dev"
LEGACY_BOOTSTRAP_OWNER_EMAIL = "bootstrap@yasnopro.local"
BOOTSTRAP_OWNER_FULL_NAME = "Bootstrap Owner"
BOOTSTRAP_OWNER_PASSWORD_ENV = "YASNOPRO_BOOTSTRAP_OWNER_PASSWORD"
BOOTSTRAP_OWNER_DEFAULT_PASSWORD = "YasnoProBootstrap2026!"

USER_ACCOUNT_STATUS_ACTIVE = "active"
USER_ACCOUNT_STATUS_BOOTSTRAP = "bootstrap"
USER_ACCOUNT_STATUS_DISABLED = "disabled"


def resolve_bootstrap_owner_password() -> str:
    configured = str(os.getenv(BOOTSTRAP_OWNER_PASSWORD_ENV, "")).strip()
    if configured:
        return configured
    return BOOTSTRAP_OWNER_DEFAULT_PASSWORD
