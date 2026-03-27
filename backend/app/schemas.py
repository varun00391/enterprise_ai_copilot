from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserOut(BaseModel):
    id: int
    email: str
    role: str

    model_config = {"from_attributes": True}


class DepartmentOut(BaseModel):
    id: int
    name: str
    slug: str

    model_config = {"from_attributes": True}


class DocumentStatusEnum(str, Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class DocumentOut(BaseModel):
    id: int
    department_id: int
    filename: str
    mime_type: str | None
    source_type: str
    status: DocumentStatusEnum
    error_message: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    department_id: int | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict] = []


class UrlIngestRequest(BaseModel):
    url: str = Field(min_length=4, max_length=2048)
    department_id: int
