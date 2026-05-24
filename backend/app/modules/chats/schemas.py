from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ChatUserOut(BaseModel):
    id: int | None = None
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None

    class Config:
        from_attributes = True


class ChatAttachmentIn(BaseModel):
    file_url: str = Field(..., min_length=1, max_length=1000)
    file_name: str = Field(..., min_length=1, max_length=500)
    file_type: str | None = None
    file_size: int | None = None


class ChatAttachmentOut(BaseModel):
    id: int
    file_url: str
    file_name: str
    file_type: str | None = None
    file_size: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatReactionOut(BaseModel):
    id: int
    emoji: str
    user_id: int
    created_at: datetime
    user: ChatUserOut | None = None

    class Config:
        from_attributes = True


class ChatMentionIn(BaseModel):
    user_id: int
    mention_key: str | None = None


class ChatMentionOut(BaseModel):
    id: int
    user_id: int
    mention_key: str | None = None
    is_notified: bool = False
    created_at: datetime
    user: ChatUserOut | None = None

    class Config:
        from_attributes = True


class ChatParticipantIn(BaseModel):
    user_id: int
    role: str = "member"


class ChatParticipantOut(BaseModel):
    id: int
    chat_id: int
    user_id: int
    role: str
    is_muted: bool
    is_pinned: bool
    last_read_message_id: int | None = None
    joined_at: datetime
    user: ChatUserOut | None = None

    class Config:
        from_attributes = True


class ChatCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    type: str = Field(default="group", max_length=50)

    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None

    workspace_id: int | None = None
    participant_ids: list[int] = Field(default_factory=list)


class ChatUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None

    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None


class ChatOut(BaseModel):
    id: int

    title: str
    description: str | None = None
    type: str

    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None

    workspace_id: int | None = None

    created_by_id: int
    created_at: datetime
    updated_at: datetime

    created_by: ChatUserOut | None = None
    participants: list[ChatParticipantOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ChatListItemOut(BaseModel):
    id: int

    title: str
    description: str | None = None
    type: str

    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None

    workspace_id: int | None = None

    created_at: datetime
    updated_at: datetime

    unread_count: int = 0
    last_message: "ChatMessageOut | None" = None
    participants_count: int = 0
    is_pinned: bool = False
    is_muted: bool = False

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    content: str | None = None
    parent_message_id: int | None = None
    attachments: list[ChatAttachmentIn] = Field(default_factory=list)
    mentions: list[ChatMentionIn] = Field(default_factory=list)


class ChatMessageUpdate(BaseModel):
    content: str | None = None
    mentions: list[ChatMentionIn] | None = None


class ChatMessageOut(BaseModel):
    id: int
    chat_id: int
    parent_message_id: int | None = None
    content: str | None = None
    created_by_id: int
    edited_at: datetime | None = None
    deleted_at: datetime | None = None
    created_at: datetime

    created_by: ChatUserOut | None = None
    attachments: list[ChatAttachmentOut] = Field(default_factory=list)
    reactions: list[ChatReactionOut] = Field(default_factory=list)
    mentions: list[ChatMentionOut] = Field(default_factory=list)

    parent_message: "ChatMessageOut | None" = None

    class Config:
        from_attributes = True


class ChatMessagesPageOut(BaseModel):
    items: list[ChatMessageOut] = Field(default_factory=list)
    total: int = 0
    limit: int = 50
    offset: int = 0


class ChatReactionCreate(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=50)


class ChatReadStateUpdate(BaseModel):
    last_read_message_id: int


class ChatParticipantUpdate(BaseModel):
    role: str | None = None
    is_muted: bool | None = None
    is_pinned: bool | None = None


class DirectChatCreate(BaseModel):
    user_id: int


ChatListItemOut.model_rebuild()
ChatMessageOut.model_rebuild()