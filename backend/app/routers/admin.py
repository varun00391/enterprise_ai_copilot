from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import require_admin
from app.config import get_settings
from app.database import get_db
from app.models import Chunk, Department, Document, DocumentStatus, User
from app.rag.dense_store import get_dense_store
from app.rag.ingest import ingest_file_document, ingest_text_for_document, remove_document_files
from app.rag.sparse_store import get_sparse_store
from app.schemas import DocumentOut, UrlIngestRequest
from app.services.file_extractors import extract_from_url

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/documents", response_model=list[DocumentOut])
async def list_documents(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> list[Document]:
    result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    return list(result.scalars().all())


@router.post("/upload-batch", response_model=list[DocumentOut])
async def upload_batch(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    department_id: Annotated[int, Form()],
    files: Annotated[list[UploadFile], File()],
) -> list[Document]:
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided")
    settings = get_settings()
    res = await db.execute(select(Department).where(Department.id == department_id))
    dept = res.scalar_one_or_none()
    if dept is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    out: list[Document] = []
    dept_dir = settings.upload_dir / str(department_id)
    dept_dir.mkdir(parents=True, exist_ok=True)

    for file in files:
        safe_name = file.filename or "upload"
        dest = dept_dir / f"{uuid4().hex}_{safe_name}"
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            doc = Document(
                department_id=department_id,
                filename=safe_name,
                stored_path="",
                mime_type=file.content_type,
                source_type="file",
                status=DocumentStatus.failed,
                error_message="Max 50MB per file",
            )
            db.add(doc)
            await db.commit()
            await db.refresh(doc)
            out.append(doc)
            continue
        dest.write_bytes(content)
        doc = Document(
            department_id=department_id,
            filename=safe_name,
            stored_path=str(dest),
            mime_type=file.content_type,
            source_type="file",
            status=DocumentStatus.pending,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        await ingest_file_document(db, doc, dest, file.content_type)
        await db.refresh(doc)
        out.append(doc)
    return out


@router.post("/upload", response_model=DocumentOut)
async def upload(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
    department_id: Annotated[int, Form()],
    file: Annotated[UploadFile, File()],
) -> Document:
    settings = get_settings()
    res = await db.execute(select(Department).where(Department.id == department_id))
    dept = res.scalar_one_or_none()
    if dept is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    safe_name = file.filename or "upload"
    dept_dir = settings.upload_dir / str(department_id)
    dept_dir.mkdir(parents=True, exist_ok=True)
    dest = dept_dir / f"{uuid4().hex}_{safe_name}"
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Max 50MB")
    dest.write_bytes(content)

    doc = Document(
        department_id=department_id,
        filename=safe_name,
        stored_path=str(dest),
        mime_type=file.content_type,
        source_type="file",
        status=DocumentStatus.pending,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    await ingest_file_document(db, doc, dest, file.content_type)
    await db.refresh(doc)
    return doc


@router.post("/ingest-url", response_model=DocumentOut)
async def ingest_url(
    body: UrlIngestRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> Document:
    settings = get_settings()
    res = await db.execute(select(Department).where(Department.id == body.department_id))
    dept = res.scalar_one_or_none()
    if dept is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    try:
        text = extract_from_url(body.url)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    name = f"url_{uuid4().hex[:10]}.txt"
    dept_dir = settings.upload_dir / str(body.department_id) / "urls"
    dept_dir.mkdir(parents=True, exist_ok=True)
    dest = dept_dir / name
    dest.write_text(text, encoding="utf-8")

    doc = Document(
        department_id=body.department_id,
        filename=body.url[:200],
        stored_path=str(dest),
        mime_type="text/plain",
        source_type="url",
        status=DocumentStatus.pending,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    await ingest_text_for_document(db, doc, text)
    await db.refresh(doc)
    return doc


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(require_admin)],
) -> None:
    result = await db.execute(
        select(Document).options(selectinload(Document.chunks)).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    dept_id = doc.department_id
    get_dense_store().delete_by_document_id(doc.id)
    await db.execute(delete(Chunk).where(Chunk.document_id == doc.id))
    await remove_document_files(doc.stored_path)
    await db.delete(doc)
    await db.commit()

    sparse = get_sparse_store()
    await sparse.rebuild_after_ingest(db, dept_id)
