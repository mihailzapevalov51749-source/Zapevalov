class DesignerError(Exception):
    """Base platform designer error."""


class DesignerNotFoundError(DesignerError):
    pass


class DesignerConflictError(DesignerError):
    pass


class DesignerForbiddenError(DesignerError):
    pass


class DesignerValidationError(DesignerError):
    pass


class FieldNotFound(DesignerNotFoundError):
    """Field definition not found."""


class DuplicateFieldKey(DesignerConflictError):
    """Field key already exists for object type."""


class RelationNotFound(DesignerNotFoundError):
    """Relation definition not found."""


class DuplicateRelationKey(DesignerConflictError):
    """Relation key already exists for tenant."""


class ViewNotFound(DesignerNotFoundError):
    """View definition not found."""


class DuplicateViewKey(DesignerConflictError):
    """View key already exists for object type."""


class DefaultViewDeleteError(DesignerValidationError):
    """Cannot delete default view while other active views exist."""


class PublishValidationError(DesignerValidationError):
    """Publish validation failed."""


class CatalogNotFound(DesignerNotFoundError):
    """Published metadata catalog not found for tenant."""


class RuntimeEntityNotFound(DesignerNotFoundError):
    """Runtime entity not found."""


class RuntimeEntityValidationError(DesignerValidationError):
    """Runtime entity values validation failed."""


class RuntimeRelationInstanceNotFound(DesignerNotFoundError):
    """Runtime relation instance not found."""


class DuplicateRelationInstanceError(DesignerConflictError):
    """Active relation instance already exists."""
