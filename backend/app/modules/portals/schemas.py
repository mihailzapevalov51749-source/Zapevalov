from pydantic import BaseModel


class PortalCreate(BaseModel):
    name: str
    description: str | None = None


class PortalResponse(BaseModel):
    id: int
    name: str
    description: str | None = None

    class Config:
        from_attributes = True