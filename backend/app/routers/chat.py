from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.rag.hybrid_retriever import hybrid_retrieve
from app.rag.llm import generate_answer
from app.schemas import ChatRequest, ChatResponse

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
