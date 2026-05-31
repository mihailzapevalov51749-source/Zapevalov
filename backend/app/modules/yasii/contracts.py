"""YASII Request / Response formal contracts (P1-W07). DTO only — no runtime or ACE."""

from pydantic import BaseModel, Field

REQUEST_SCHEMA_VERSION = "0.1.0"
RESPONSE_SCHEMA_VERSION = "0.1.0"
DEFAULT_REQUEST_TYPE = "yasii.request"
DEFAULT_RESPONSE_TYPE = "yasii.response"
DEFAULT_RESPONSE_STATUS = "ok"


class YASIIRequest(BaseModel):
    """Minimal normative request envelope for future YASII pipeline."""

    schemaVersion: str = Field(default=REQUEST_SCHEMA_VERSION)
    requestId: str
    requestType: str = Field(default=DEFAULT_REQUEST_TYPE)
    surfaceId: str | None = None
    payload: dict = Field(default_factory=dict)


class YASIIResponse(BaseModel):
    """Minimal normative response envelope for future YASII pipeline."""

    schemaVersion: str = Field(default=RESPONSE_SCHEMA_VERSION)
    requestId: str
    responseType: str = Field(default=DEFAULT_RESPONSE_TYPE)
    status: str = Field(default=DEFAULT_RESPONSE_STATUS)
    payload: dict = Field(default_factory=dict)


class YASIIEmbeddedQueryRequest(BaseModel):
    """Embedded entry request — requires ACE handoff before runtime execution."""

    handoffId: str
    queryText: str
