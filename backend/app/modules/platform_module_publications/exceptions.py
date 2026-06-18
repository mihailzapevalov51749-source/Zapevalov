"""Publication pipeline precondition errors."""

from __future__ import annotations


class PublicationPreconditionError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)
