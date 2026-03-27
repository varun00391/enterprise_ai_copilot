from __future__ import annotations

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from app.config import get_settings


class DenseStore:
    def __init__(self) -> None:
        settings = get_settings()
        self._ef = SentenceTransformerEmbeddingFunction(model_name=settings.embedding_model)
        self._client = chromadb.PersistentClient(path=str(settings.chroma_dir))
        self._col = self._client.get_or_create_collection(
            name="enterprise_chunks",
            embedding_function=self._ef,
            metadata={"hnsw:space": "cosine"},
        )

    def upsert_chunks(
        self,
        ids: list[str],
        texts: list[str],
        metadatas: list[dict],
    ) -> None:
        if not ids:
            return
        self._col.upsert(ids=ids, documents=texts, metadatas=metadatas)

    def delete_by_document_id(self, document_id: int) -> None:
        self._col.delete(where={"document_id": document_id})

    def query(
        self,
        query_text: str,
        department_id: int | None,
        n_results: int,
    ) -> list[tuple[str, str, dict]]:
        where: dict | None = None
        if department_id is not None:
            where = {"department_id": department_id}
        res = self._col.query(
            query_texts=[query_text],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )
        out: list[tuple[str, str, dict]] = []
        ids_list = res.get("ids") or [[]]
        docs_list = res.get("documents") or [[]]
        meta_list = res.get("metadatas") or [[]]
        for i in range(len(ids_list[0])):
            cid = ids_list[0][i]
            doc = (docs_list[0][i] if docs_list[0] else "") or ""
            meta = meta_list[0][i] if meta_list[0] else {}
            out.append((cid, doc, meta or {}))
        return out


_dense: DenseStore | None = None


def get_dense_store() -> DenseStore:
    global _dense
    if _dense is None:
        _dense = DenseStore()
    return _dense
