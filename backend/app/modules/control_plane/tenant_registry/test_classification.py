from app.modules.control_plane.tenant_registry.classification import (
    is_client_company_portal,
    is_infrastructure_tenant_portal,
)
from app.modules.tenant_environment.constants import TenantEnvironmentRole, TenantType


def test_infrastructure_tenant_types() -> None:
    assert is_infrastructure_tenant_portal(
        tenant_type=TenantType.DEV.value,
        environment_role=TenantEnvironmentRole.DEV.value,
    )
    assert is_infrastructure_tenant_portal(
        tenant_type=TenantType.TEMPLATE.value,
        environment_role=TenantEnvironmentRole.TEMPLATE.value,
    )


def test_demo_client_with_client_tenant_type_is_client_company() -> None:
    assert not is_infrastructure_tenant_portal(
        tenant_type=TenantType.CLIENT.value,
        environment_role=TenantEnvironmentRole.DEMO_CLIENT.value,
    )
    assert is_client_company_portal(
        tenant_type=TenantType.CLIENT.value,
        environment_role=TenantEnvironmentRole.DEMO_CLIENT.value,
    )


def test_provisioned_client_company() -> None:
    assert is_client_company_portal(
        tenant_type=TenantType.CLIENT.value,
        environment_role=None,
    )
    assert is_client_company_portal(
        tenant_type=TenantType.CLIENT.value,
        environment_role="",
    )
    assert is_client_company_portal(
        tenant_type=TenantType.CLIENT.value,
        environment_role="CLIENT",
    )


def test_non_client_tenant_types_are_not_client_companies() -> None:
    assert not is_client_company_portal(
        tenant_type=TenantType.DEV.value,
        environment_role=TenantEnvironmentRole.DEV.value,
    )
    assert not is_client_company_portal(
        tenant_type=TenantType.TEMPLATE.value,
        environment_role=TenantEnvironmentRole.TEMPLATE.value,
    )
