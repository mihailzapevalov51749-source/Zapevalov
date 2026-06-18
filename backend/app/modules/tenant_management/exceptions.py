class TenantManagementError(Exception):
    """Base error for tenant management operations."""


class SystemTenantDeleteForbiddenError(TenantManagementError):
    pass


class TenantNotFoundError(TenantManagementError):
    pass


class TenantWriteForbiddenError(TenantManagementError):
    """Direct write blocked by tenant-type policy."""


class ProtectedTenantDeleteForbiddenError(TenantManagementError):
    """Protected system/demo tenant cannot be deleted."""
