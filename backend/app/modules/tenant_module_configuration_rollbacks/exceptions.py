"""Rollback precondition errors."""

from __future__ import annotations


class RollbackPreconditionError(Exception):
    def __init__(self, reason: str, message: str):
        self.reason = reason
        self.message = message
        super().__init__(message)
