import app.modules.yasii.contracts  # noqa: F401

from app.modules.yasii.contracts import (
    DEFAULT_REQUEST_TYPE,
    DEFAULT_RESPONSE_STATUS,
    DEFAULT_RESPONSE_TYPE,
    REQUEST_SCHEMA_VERSION,
    RESPONSE_SCHEMA_VERSION,
    YASIIRequest,
    YASIIResponse,
)


def test_contracts_module_imports():
    assert YASIIRequest is not None
    assert YASIIResponse is not None


def test_yasii_request_required_fields_and_defaults():
    request = YASIIRequest(requestId="req-1")

    assert request.schemaVersion == REQUEST_SCHEMA_VERSION
    assert request.requestId == "req-1"
    assert request.requestType == DEFAULT_REQUEST_TYPE
    assert request.surfaceId is None
    assert request.payload == {}


def test_yasii_request_with_optional_fields():
    request = YASIIRequest(
        requestId="req-2",
        requestType="custom.request",
        surfaceId="portal-home",
        payload={"action": "ping"},
    )

    assert request.requestType == "custom.request"
    assert request.surfaceId == "portal-home"
    assert request.payload == {"action": "ping"}


def test_yasii_response_required_fields_and_defaults():
    response = YASIIResponse(requestId="req-1")

    assert response.schemaVersion == RESPONSE_SCHEMA_VERSION
    assert response.requestId == "req-1"
    assert response.responseType == DEFAULT_RESPONSE_TYPE
    assert response.status == DEFAULT_RESPONSE_STATUS
    assert response.payload == {}


def test_yasii_response_with_optional_fields():
    response = YASIIResponse(
        requestId="req-2",
        responseType="custom.response",
        status="accepted",
        payload={"echo": True},
    )

    assert response.responseType == "custom.response"
    assert response.status == "accepted"
    assert response.payload == {"echo": True}
