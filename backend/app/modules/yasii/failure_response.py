"""YASII FailureResponse contract (P1-W08). DTO only — no runtime error handling."""

from enum import Enum

from pydantic import BaseModel, Field

FAILURE_RESPONSE_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_FAILURE_TYPE = "placeholder"
PLACEHOLDER_FAILURE_MESSAGE = "Failure response placeholder"


class FailureCode(str, Enum):
    UNKNOWN_FAILURE = "UNKNOWN_FAILURE"
    ACCESS_DENIED = "ACCESS_DENIED"
    INVALID_REQUEST = "INVALID_REQUEST"


class FailureResponse(BaseModel):
    """Formal fail-closed response envelope; not produced by runtime pipeline yet."""

    schemaVersion: str = Field(default=FAILURE_RESPONSE_SCHEMA_VERSION)
    failureCode: str = Field(default=FailureCode.UNKNOWN_FAILURE.value)
    failureType: str = Field(default=PLACEHOLDER_FAILURE_TYPE)
    message: str = Field(default=PLACEHOLDER_FAILURE_MESSAGE)
    requestId: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)


def build_failure_response(
    *,
    failure_code: FailureCode | str = FailureCode.UNKNOWN_FAILURE,
    request_id: str | None = None,
    message: str | None = None,
    metadata: dict[str, str] | None = None,
) -> FailureResponse:
    """Stub helper: returns placeholder FailureResponse without handling exceptions."""
    code_value = failure_code.value if isinstance(failure_code, FailureCode) else failure_code
    return FailureResponse(
        failureCode=code_value,
        failureType=PLACEHOLDER_FAILURE_TYPE,
        message=message or PLACEHOLDER_FAILURE_MESSAGE,
        requestId=request_id,
        metadata=dict(metadata or {}),
    )
