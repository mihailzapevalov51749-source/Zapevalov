from pydantic import BaseModel


class AiContextHealthResponse(BaseModel):
    module: str
    status: str
    phase: str
    version: str
    architectureVersion: str


class ACEHandoffResponse(BaseModel):
    handoffId: str
    snapshotId: str
    boundaryId: str
    roleIds: list[str]
    warnings: list[str]
