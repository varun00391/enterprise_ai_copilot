from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.rag.hybrid_retriever import hybrid_retrieve
from app.rag.llm import generate_answer
from app.schemas import ChatRequest, ChatResponse
from app.services.chat_attachments import augment_message_from_uploads

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> ChatResponse:
    contexts = await hybrid_retrieve(db, body.message, body.department_id)
    answer = await generate_answer(body.message, contexts)
    sources = [
        {
            "filename": c.get("filename"),
            "document_id": c.get("document_id"),
            "department_id": c.get("department_id"),
            "preview": (c.get("text") or "")[:240],
        }
        for c in contexts
    ]
    return ChatResponse(answer=answer, sources=sources)


@router.post("/with-media", response_model=ChatResponse)
async def chat_with_media(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    message: Annotated[str, Form()] = "",
    department_id: Annotated[str | None, Form()] = None,
    image: Annotated[UploadFile | None, File()] = None,
    audio: Annotated[UploadFile | None, File()] = None,
    video: Annotated[UploadFile | None, File()] = None,
) -> ChatResponse:
    dep: int | None = None
    if department_id is not None and str(department_id).strip() != "":
        try:
            dep = int(department_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid department_id",
            ) from None

    has_media = any(x is not None for x in (image, audio, video))
    if not message.strip() and not has_media:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide a message and/or attach image, audio, or video.",
        )

    try:
        full_message = await augment_message_from_uploads(message, image, audio, video)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    contexts = await hybrid_retrieve(db, full_message, dep)
    answer = await generate_answer(full_message, contexts)
    sources = [
        {
            "filename": c.get("filename"),
            "document_id": c.get("document_id"),
            "department_id": c.get("department_id"),
            "preview": (c.get("text") or "")[:240],
        }
        for c in contexts
    ]
    return ChatResponse(answer=answer, sources=sources)
