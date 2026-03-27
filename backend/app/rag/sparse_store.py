from __future__ import annotations

import re
from collections import defaultdict

from rank_bm25 import BM25Okapi
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Chunk


def tokenize(text: str) -> list[str]:
    return [t for t in re.split(r"\W+", text.lower()) if t]


class SparseDepartmentIndex:
    def __init__(self) -> None:
        self._bm25: BM25Okapi | None = None
        self._chunk_ids: list[int] = []

    def build(self, chunk_ids: list[int], tokenized_corpus: list[list[str]]) -> None:
        self._chunk_ids = chunk_ids
        if not tokenized_corpus:
            self._bm25 = None
            return
        self._bm25 = BM25Okapi(tokenized_corpus)

    def query(self, q: str, top_k: int) -> list[tuple[int, float]]:
        if not self._bm25 or not self._chunk_ids:
            return []
        t = tokenize(q)
        if not t:
            return []
        scores = self._bm25.get_scores(t)
        ranked = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True,
        )[:top_k]
        return [(self._chunk_ids[i], float(scores[i])) for i in ranked]


class SparseStore:
    """Per-department BM25 indices, rebuilt from DB."""

    def __init__(self) -> None:
        self._indices: dict[int | None, SparseDepartmentIndex] = defaultdict(SparseDepartmentIndex)

    async def rebuild_department(self, db: AsyncSession, department_id: int | None) -> None:
        if department_id is not None:
            q = select(Chunk.id, Chunk.text).where(Chunk.department_id == department_id).order_by(Chunk.id)
        else:
            q = select(Chunk.id, Chunk.text).order_by(Chunk.id)
        result = await db.execute(q)
        rows = result.all()
        ids = [r[0] for r in rows]
        corpus = [tokenize(r[1]) for r in rows]
        key: int | None = department_id
        self._indices[key] = SparseDepartmentIndex()
        self._indices[key].build(ids, corpus)

    async def rebuild_all(self, db: AsyncSession) -> None:
        result = await db.execute(select(Chunk.department_id).distinct())
        dept_ids = [r[0] for r in result.all()]
        for did in dept_ids:
            await self.rebuild_department(db, did)
        await self.rebuild_department(db, None)

    async def rebuild_after_ingest(self, db: AsyncSession, department_id: int) -> None:
        await self.rebuild_department(db, department_id)
        await self.rebuild_department(db, None)

    def query(
        self,
        query_text: str,
        department_id: int | None,
        top_k: int,
    ) -> list[tuple[str, float]]:
        # Prefer department-specific index; fallback to global
        idx = self._indices.get(department_id)
        if idx is None or idx._bm25 is None:
            idx = self._indices.get(None)
        if idx is None or idx._bm25 is None:
            return []
        ranked = idx.query(query_text, top_k)
        return [(str(cid), score) for cid, score in ranked]


_sparse: SparseStore | None = None


def get_sparse_store() -> SparseStore:
    global _sparse
    if _sparse is None:
        _sparse = SparseStore()
    return _sparse
