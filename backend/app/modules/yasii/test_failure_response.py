import app.modules.yasii.failure_response  # noqa: F401

from app.modules.yasii.failure_response import (
    FAILURE_RESPONSE_SCHEMA_VERSION,
    PLACEHOLDER_FAILURE_MESSAGE,
    PLACEHOLDER_FAILURE_TYPE,
    FailureCode,
    FailureResponse,
    build_failure_response,
)


def test_failure_response_module_imports():
    assert FailureResponse is not None
    assert build_failure_response is not None


def test_failure_response_defaults():
    response = FailureResponse()

    assert response.schemaVersion == FAILURE_RESPONSE_SCHEMA_VERSION
    assert response.failureCode == FailureCode.UNKNOWN_FAILURE.value
    assert response.failureType == PLACEHOLDER_FAILURE_TYPE
    assert response.message == PLACEHOLDER_FAILURE_MESSAGE
    assert response.requestId is None
    assert response.metadata == {}


def test_failure_codes_defined():
    assert FailureCode.UNKNOWN_FAILURE.value == "UNKNOWN_FAILURE"
    assert FailureCode.ACCESS_DENIED.value == "ACCESS_DENIED"
    assert FailureCode.INVALID_REQUEST.value == "INVALID_REQUEST"


def test_build_failure_response_placeholder():
    response = build_failure_response(request_id="req-1")

    assert response.failureCode == "UNKNOWN_FAILURE"
    assert response.failureType == "placeholder"
    assert response.message == "Failure response placeholder"
    assert response.requestId == "req-1"
    assert response.metadata == {}


def test_build_failure_response_custom_code_and_message():
    response = build_failure_response(
        failure_code=FailureCode.ACCESS_DENIED,
        message="Access denied placeholder",
        metadata={"surface": "portal"},
    )

    assert response.failureCode == "ACCESS_DENIED"
    assert response.message == "Access denied placeholder"
    assert response.metadata == {"surface": "portal"}
