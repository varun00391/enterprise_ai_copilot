from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Chunk, Document
from app.rag.dense_store import get_dense_store
from app.rag.sparse_store import get_sparse_store


def reciprocal_rank_fusion(
    ranked_id_lists: list[list[str]],
    k: int,
    max_results: int,
) -> list[str]:
    scores: dict[str, float] = {}
    for ids in ranked_id_lists:
        for rank, cid in enumerate(ids):
            scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
    ordered = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
    return ordered[:max_results]


async def hybrid_retrieve(
    db: AsyncSession,
    query: str,
    department_id: int | None,
) -> list[dict]:
    settings = get_settings()
    dense_k = settings.dense_top_k
    sparse_k = settings.sparse_top_k
    final_k = settings.hybrid_top_k
    rrf_k = settings.rrf_k

    dense = get_dense_store()
    sparse = get_sparse_store()

    dense_hits = dense.query(query, department_id, dense_k)
    dense_ids = [h[0] for h in dense_hits]
    dense_map = {h[0]: {"text": h[1], "meta": h[2]} for h in dense_hits}

    sparse_pairs = sparse.query(query, department_id, sparse_k)
    sparse_ids = [p[0] for p in sparse_pairs]

    fused_ids = reciprocal_rank_fusion([dense_ids, sparse_ids], rrf_k, final_k)

    if not fused_ids:
        return []

    id_list: list[int] = []
    for x in fused_ids:
        try:
            id_list.append(int(x))
        except (TypeError, ValueError):
            continue
    if not id_list:
        return []

    result = await db.execute(
        select(Chunk, Document.filename).join(Document).where(Chunk.id.in_(id_list))
    )
    rows = result.all()
    by_id: dict[int, tuple[Chunk, str]] = {c.id: (c, fn) for c, fn in rows}

    out: list[dict] = []
    for cid_str in fused_ids:
        try:
            cid = int(cid_str)
        except (TypeError, ValueError):
            continue
        if cid not in by_id:
            continue
        chunk, filename = by_id[cid]
        extra = dense_map.get(cid_str, {})
        text = extra.get("text") or chunk.text
        meta = extra.get("meta") or {}
        out.append(
            {
                "chunk_id": cid,
                "text": text,
                "filename": filename,
                "department_id": chunk.department_id,
                "document_id": chunk.document_id,
                "source": meta.get("source_type", "file"),
            }
        )
    return out
