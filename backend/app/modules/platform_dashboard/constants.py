from enum import Enum


class PlatformTaskStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
    BLOCKED = "blocked"


class PlatformComponentStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
    BLOCKED = "blocked"


class PlatformStageStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
    BLOCKED = "blocked"


class PlatformTaskPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class PlatformActivityType(str, Enum):
    DASHBOARD_REFRESH = "dashboard_refresh"
    READINESS_COMPONENT = "readiness_component"
    READINESS_STAGE = "readiness_stage"
    DECISION = "decision"
    QUALITY = "quality"
    ANALYSIS = "analysis"
    MILESTONE = "milestone"
