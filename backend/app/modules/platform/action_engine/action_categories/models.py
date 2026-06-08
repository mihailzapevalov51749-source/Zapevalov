from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ActionCategory:
    """Grouping layer for Action Types — not an Action Definition."""

    key: str
    name: str
    description: str
    sort_order: int = 0
    is_active: bool = True
    is_system: bool = True
