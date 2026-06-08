from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ActionType:
    """
    System behavior template — not a user-facing Action Definition.

    Action Definition (next phase) references ActionType.key.
    """

    key: str
    name: str
    description: str
    category_key: str
    is_active: bool = True
    is_system: bool = True
