"""Central tenant-type write policy for DEV / TEMPLATE / CLIENT isolation."""



from __future__ import annotations



from sqlalchemy.orm import Session



from app.modules.portals.models import Portal

from app.modules.tenant_bootstrap.constants import PLATFORM_TEMPLATE_TENANT_ID

from app.modules.tenant_environment.constants import TenantEnvironmentRole, TenantType

from app.modules.tenant_environment.resolver import resolve_portal_tenant_type, resolve_template_tenant_id

from app.modules.tenant_management.constants import SYSTEM_TENANT_ID

from app.modules.tenant_management.exceptions import (

    ProtectedTenantDeleteForbiddenError,

    TenantWriteForbiddenError,

)



PROTECTED_ENVIRONMENT_ROLES = frozenset({

    TenantEnvironmentRole.DEV.value,

    TenantEnvironmentRole.TEMPLATE.value,

    TenantEnvironmentRole.DEMO_CLIENT.value,

    TenantEnvironmentRole.DEMO.value,

})



PROTECTED_DELETE_MESSAGE = "Tenant is protected and cannot be deleted."





def _resolve_portal(db: Session, tenant_id: int) -> Portal:

    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()

    if portal is None:

        raise TenantWriteForbiddenError(f"Tenant portal {tenant_id} not found")

    return portal





def resolve_portal_tenant_type_for_policy(db: Session, tenant_id: int) -> TenantType:

    portal = _resolve_portal(db, tenant_id)

    return resolve_portal_tenant_type(portal, tenant_id=tenant_id)





def is_protected_tenant_portal(portal: Portal, *, tenant_id: int | None = None) -> bool:

    resolved_id = int(tenant_id if tenant_id is not None else portal.id)



    if bool(getattr(portal, "is_protected", False)):

        return True



    environment_role = str(getattr(portal, "environment_role", "") or "").strip().upper()

    if environment_role in PROTECTED_ENVIRONMENT_ROLES:

        return True



    if resolved_id in {SYSTEM_TENANT_ID, PLATFORM_TEMPLATE_TENANT_ID}:

        return True



    tenant_type = str(getattr(portal, "tenant_type", "") or "").strip().upper()

    if tenant_type in {TenantType.DEV.value, TenantType.TEMPLATE.value}:

        return True



    return False





def is_protected_tenant_for_delete(db: Session, tenant_id: int) -> bool:

    from app.modules.platform_event_journal.seed_classification import resolve_dev_tenant_portal_id



    dev_tenant_id = resolve_dev_tenant_portal_id(db)

    if tenant_id == dev_tenant_id:

        return True



    template_tenant_id = resolve_template_tenant_id(db)

    if template_tenant_id is not None and tenant_id == template_tenant_id:

        return True



    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()

    if portal is None:

        return False



    return is_protected_tenant_portal(portal, tenant_id=tenant_id)





def assert_tenant_allows_direct_structure_write(

    db: Session,

    tenant_id: int,

    operation_name: str,

) -> None:

    """Guard company constructor structure writes by tenant type.

    Level 2 (company constructor): DEV develops platform catalog; CLIENT configures
    own tenant structure (users, objects, fields, views, workspaces, processes).

    TEMPLATE must not mutate structure directly — delivery is via platform
    publication / release pipeline from DEV.
    """

    tenant_type = resolve_portal_tenant_type_for_policy(db, tenant_id)

    if tenant_type in {TenantType.DEV, TenantType.CLIENT}:

        return



    raise TenantWriteForbiddenError(

        f"Direct structure write is allowed only in DEV and CLIENT tenants "

        f"(operation={operation_name}, tenant_id={tenant_id}, tenant_type={tenant_type.value})",

    )





def assert_tenant_allows_direct_module_config_write(

    db: Session,

    tenant_id: int,

    operation_name: str,

) -> None:

    tenant_type = resolve_portal_tenant_type_for_policy(db, tenant_id)

    if tenant_type == TenantType.DEV:

        return



    raise TenantWriteForbiddenError(

        f"Direct module configuration write is allowed only in DEV tenant "

        f"(operation={operation_name}, tenant_id={tenant_id}, tenant_type={tenant_type.value})",

    )





def assert_tenant_allows_publish_target(db: Session, tenant_id: int) -> None:

    tenant_type = resolve_portal_tenant_type_for_policy(db, tenant_id)

    if tenant_type != TenantType.TEMPLATE:

        raise TenantWriteForbiddenError(

            f"Publish target must be TEMPLATE tenant (tenant_id={tenant_id}, tenant_type={tenant_type.value})",

        )





def assert_tenant_allows_publish_source(db: Session, tenant_id: int) -> None:

    tenant_type = resolve_portal_tenant_type_for_policy(db, tenant_id)

    if tenant_type != TenantType.DEV:

        raise TenantWriteForbiddenError(

            f"Publish source must be DEV tenant (tenant_id={tenant_id}, tenant_type={tenant_type.value})",

        )





def assert_tenant_allows_apply_target(db: Session, tenant_id: int) -> None:

    tenant_type = resolve_portal_tenant_type_for_policy(db, tenant_id)

    if tenant_type != TenantType.CLIENT:

        raise TenantWriteForbiddenError(

            f"Apply target must be CLIENT tenant (tenant_id={tenant_id}, tenant_type={tenant_type.value})",

        )





def assert_tenant_allows_rollback_target(db: Session, tenant_id: int) -> None:

    tenant_type = resolve_portal_tenant_type_for_policy(db, tenant_id)

    if tenant_type != TenantType.CLIENT:

        raise TenantWriteForbiddenError(

            f"Rollback target must be CLIENT tenant (tenant_id={tenant_id}, tenant_type={tenant_type.value})",

        )





def assert_tenant_allows_delete(db: Session, tenant_id: int) -> None:

    if is_protected_tenant_for_delete(db, tenant_id):

        raise ProtectedTenantDeleteForbiddenError(PROTECTED_DELETE_MESSAGE)





def assert_tenant_allows_archive(db: Session, tenant_id: int) -> None:

    if is_protected_tenant_for_delete(db, tenant_id):

        raise ProtectedTenantDeleteForbiddenError(PROTECTED_DELETE_MESSAGE)





def assert_script_allows_direct_structure_write(

    db: Session,

    tenant_id: int,

    *,

    script_name: str,

    bypass_write_policy: bool = False,

) -> None:

    if bypass_write_policy:

        return

    assert_tenant_allows_direct_structure_write(

        db,

        tenant_id,

        operation_name=f"script:{script_name}",

    )





def assert_script_allows_direct_module_config_write(

    db: Session,

    tenant_id: int,

    *,

    script_name: str,

    bypass_module_config_write_policy: bool = False,

) -> None:

    if bypass_module_config_write_policy:

        return

    assert_tenant_allows_direct_module_config_write(

        db,

        tenant_id,

        operation_name=f"script:{script_name}",

    )


