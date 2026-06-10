class TenantManagementError(Exception):
    """Base error for tenant management operations."""


class SystemTenantDeleteForbiddenError(TenantManagementError):
    pass


class TenantNotFoundError(TenantManagementError):
    pass
