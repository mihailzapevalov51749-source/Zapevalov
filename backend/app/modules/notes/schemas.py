from datetime import datetime

from pydantic import BaseModel, Field


class NoteMentionOut(BaseModel):
    id: int
    user_id: int
    mention_key: str
    is_notified: bool
    published_version: int
    created_at: datetime

    class Config:
        from_attributes = True


class NoteOut(BaseModel):
    id: int

    entity_type: str
    entity_id: str

    content: str
    format: str

    published_version: int

    created_at: datetime
    updated_at: datetime

    mentions: list[NoteMentionOut] = []

    class Config:
        from_attributes = True


class NoteUpsert(BaseModel):
    entity_type: str = Field(
        ...,
        min_length=1,
        max_length=80,
    )

    entity_id: str = Field(
        ...,
        min_length=1,
        max_length=120,
    )

    content: str = ""

    format: str = Field(
        default="html",
        max_length=30,
    )


class PublishedRuntimeRefPayload(BaseModel):
    object_type_key: str | None = Field(default=None, max_length=120)
    runtime_entity_id: str | None = Field(default=None, max_length=120)
    view_key: str | None = Field(default=None, max_length=120)
    catalog_version: str | None = Field(default=None, max_length=120)
    runtime_route: str | None = Field(default=None, max_length=500)


class NotePublish(BaseModel):
    entity_type: str = Field(
        ...,
        min_length=1,
        max_length=80,
    )

    entity_id: str = Field(
        ...,
        min_length=1,
        max_length=120,
    )

    table_id: str | None = Field(
        default=None,
        max_length=120,
    )

    content: str = ""

    format: str = Field(
        default="html",
        max_length=30,
    )

    mentioned_user_ids: list[int] = []

    mention_keys: list[str] = []

    published_runtime_ref: PublishedRuntimeRefPayload | None = None