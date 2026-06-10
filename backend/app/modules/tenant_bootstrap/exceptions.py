class TenantBootstrapError(Exception):
    """Base error for tenant structure bootstrap."""


class SourceTenantNotFoundError(TenantBootstrapError):
    pass


class TargetTenantNotFoundError(TenantBootstrapError):
    pass


class SourceTenantHasNoStructureError(TenantBootstrapError):
    pass


class TargetTenantAlreadyHasStructureError(TenantBootstrapError):
    """Target tenant already has bootstrap structure; clone is refused."""
