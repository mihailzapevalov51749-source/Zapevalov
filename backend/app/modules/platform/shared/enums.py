from enum import StrEnum


class ObjectTypeStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class FieldType(StrEnum):
    TEXT = "text"
    TEXTAREA = "textarea"
    NUMBER = "number"
    BOOLEAN = "boolean"
    DATE = "date"
    DATETIME = "datetime"
    CHOICE = "choice"
    MULTI_CHOICE = "multi_choice"
    UUID = "uuid"


class RelationType(StrEnum):
    ONE_TO_ONE = "one_to_one"
    ONE_TO_MANY = "one_to_many"
    MANY_TO_MANY = "many_to_many"


class ViewType(StrEnum):
    TABLE = "table"
    BOARD = "board"
    TREE = "tree"
    CALENDAR = "calendar"
    TIMELINE = "timeline"
    GALLERY = "gallery"
    FORM = "form"
    COMPOSITE = "composite"


class PublishStatus(StrEnum):
    SUCCESS = "success"
    FAILED = "failed"
