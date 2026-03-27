from __future__ import annotations

import shutil
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Chunk, Document, DocumentStatus
from app.rag.chunking import split_text
from app.rag.dense_store import get_dense_store
from app.rag.sparse_store import get_sparse_store
from app.services.file_extractors import extract_text


async def ingest_file_document(
    db: AsyncSession,
    document: Document,
    file_path: Path,
    mime: str | None,
) -> None:
    document.status = DocumentStatus.processing
    await db.commit()
    try:
        text = extract_text(file_path, mime)
        chunks = split_text(text)
        if not chunks:
            document.status = DocumentStatus.failed
            document.error_message = "No extractable text"
            await db.commit()
            return

        await db.execute(delete(Chunk).where(Chunk.document_id == document.id))
        get_dense_store().delete_by_document_id(document.id)

        rows: list[Chunk] = []
        for i, ch in enumerate(chunks):
            rows.append(
                Chunk(
                    document_id=document.id,
                    department_id=document.department_id,
                    text=ch,
                    chunk_index=i,
                    chroma_id=None,
                )
            )
        db.add_all(rows)
        await db.flush()

        chroma_ids: list[str] = []
        texts: list[str] = []
        metas: list[dict] = []
        for row, ch in zip(rows, chunks, strict=True):
            cid = str(row.id)
            row.chroma_id = cid
            chroma_ids.append(cid)
            texts.append(ch)
            metas.append(
                {
                    "document_id": document.id,
                    "department_id": document.department_id,
                    "filename": document.filename,
                    "source_type": document.source_type,
                    "chunk_index": row.chunk_index,
                }
            )
        await db.flush()
        get_dense_store().upsert_chunks(chroma_ids, texts, metas)
        document.status = DocumentStatus.ready
        document.error_message = None
        await db.commit()

        sparse = get_sparse_store()
        await sparse.rebuild_after_ingest(db, document.department_id)
    except Exception as e:  # noqa: BLE001
        document.status = DocumentStatus.failed
        document.error_message = str(e)[:2000]
        await db.commit()
        raise


async def ingest_text_for_document(
    db: AsyncSession,
    document: Document,
    text: str,
) -> None:
    document.status = DocumentStatus.processing
    await db.commit()
    try:
        chunks = split_text(text)
        if not chunks:
            document.status = DocumentStatus.failed
            document.error_message = "No extractable text"
            await db.commit()
            return

        await db.execute(delete(Chunk).where(Chunk.document_id == document.id))
        get_dense_store().delete_by_document_id(document.id)

        rows: list[Chunk] = []
        for i, ch in enumerate(chunks):
            rows.append(
                Chunk(
                    document_id=document.id,
                    department_id=document.department_id,
                    text=ch,
                    chunk_index=i,
                    chroma_id=None,
                )
            )
        db.add_all(rows)
        await db.flush()

        chroma_ids: list[str] = []
        texts: list[str] = []
        metas: list[dict] = []
        for row, ch in zip(rows, chunks, strict=True):
            cid = str(row.id)
            row.chroma_id = cid
            chroma_ids.append(cid)
            texts.append(ch)
            metas.append(
                {
                    "document_id": document.id,
                    "department_id": document.department_id,
                    "filename": document.filename,
                    "source_type": document.source_type,
                    "chunk_index": row.chunk_index,
                }
            )
        await db.flush()
        get_dense_store().upsert_chunks(chroma_ids, texts, metas)
        document.status = DocumentStatus.ready
        document.error_message = None
        await db.commit()

        sparse = get_sparse_store()
        await sparse.rebuild_after_ingest(db, document.department_id)
    except Exception as e:  # noqa: BLE001
        document.status = DocumentStatus.failed
        document.error_message = str(e)[:2000]
        await db.commit()
        raise


async def remove_document_files(path_str: str) -> None:
    p = Path(path_str)
    if p.exists():
        if p.is_dir():
            shutil.rmtree(p, ignore_errors=True)
        else:
            p.unlink(missing_ok=True)
