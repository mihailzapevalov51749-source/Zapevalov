from pydantic import BaseModel


class YasiiHealthResponse(BaseModel):
    module: str
    status: str
    phase: str
    version: str
    architectureVersion: str
