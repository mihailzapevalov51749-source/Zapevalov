from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CommentEntityRef(BaseModel):
    type: str = Field(..., min_length=1, max_length=80)
    id: str = Field(..., min_length=1, max_length=120)


class CommentAuthorOut(BaseModel):
    id: int | None = None
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None


class CommentAttachmentOut(BaseModel):
    id: int
    file_url: str
    file_name: str
    file_type: str | None = None
    file_size: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class CommentAttachmentPayload(BaseModel):
    id: int | None = None
    file_url: str | None = Field(default=None, max_length=1000)
    file_name: str | None = Field(default=None, max_length=255)
    file_type: str | None = Field(default=None, max_length=120)
    file_size: int | None = None


class CommentMentionOut(BaseModel):
    id: int
    mentioned_user_id: int
    is_read: bool = False
    notification_status: str = "pending"
    created_at: datetime

    class Config:
        from_attributes = True


class CommentReactionOut(BaseModel):
    id: int
    user_id: int
    emoji_key: str
    created_at: datetime

    class Config:
        from_attributes = True


class CommentBase(BaseModel):
    entity_type: str = Field(..., min_length=1, max_length=80)
    entity_id: str = Field(..., min_length=1, max_length=120)

    # Для комментариев к файлам:
    # entity_id может быть названием/ключом сущности,
    # а file_id должен хранить технический ID/ключ файла для deep-link.
    file_id: str | None = Field(default=None, max_length=120)

    body: str = Field(default="", max_length=10000)
    body_format: str = Field(default="plain", max_length=30)


class CommentCreate(CommentBase):
    parent_comment_id: int | None = None
    mentioned_user_ids: list[int] = Field(default_factory=list)


class SystemCommentCreate(BaseModel):
    entity_type: str = Field(..., min_length=1, max_length=80)
    entity_id: str = Field(..., min_length=1, max_length=120)
    file_id: str | None = Field(default=None, max_length=120)
    system_event_key: str = Field(..., min_length=1, max_length=120)
    system_payload: dict[str, Any] = Field(default_factory=dict)


class CommentUpdate(BaseModel):
    body: str = Field(..., min_length=0, max_length=10000)
    body_format: str = Field(default="plain", max_length=30)
    mentioned_user_ids: list[int] = Field(default_factory=list)
    attachments: list[CommentAttachmentPayload] | None = None
    files: list[CommentAttachmentPayload] | None = None


class CommentPinUpdate(BaseModel):
    is_pinned: bool


class CommentReactionCreate(BaseModel):
    emoji_key: str = Field(..., min_length=1, max_length=80)


class CommentAttachmentCreate(BaseModel):
    file_url: str = Field(..., min_length=1, max_length=1000)
    file_name: str = Field(..., min_length=1, max_length=255)
    file_type: str | None = Field(default=None, max_length=120)
    file_size: int | None = None


class CommentOut(BaseModel):
    id: int

    entity_type: str
    entity_id: str
    file_id: str | None = None

    parent_comment_id: int | None = None

    kind: str
    system_event_key: str | None = None
    system_payload: dict[str, Any] | None = None

    body: str
    body_format: str

    author_user_id: int | None = None
    author: CommentAuthorOut | None = None
    author_snapshot: dict[str, Any] | None = None

    is_pinned: bool = False
    pinned_at: datetime | None = None
    pinned_by_user_id: int | None = None

    edited_at: datetime | None = None
    edited_by_user_id: int | None = None

    deleted_at: datetime | None = None
    deleted_by_user_id: int | None = None
    delete_reason: str | None = None

    version: int

    created_at: datetime
    updated_at: datetime

    attachments: list[CommentAttachmentOut] = Field(default_factory=list)
    mentions: list[CommentMentionOut] = Field(default_factory=list)
    reactions: list[CommentReactionOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CommentsListOut(BaseModel):
    items: list[CommentOut]
    total: int