from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import get_settings
from app.database import async_session_maker, init_db
from app.models import Department, User, UserRole
from app.auth import hash_password
from app.routers import admin, auth, chat, departments
from app.rag.sparse_store import get_sparse_store


async def seed() -> None:
    async with async_session_maker() as db:
        for name, slug in [
            ("Human Resources", "hr"),
            ("Marketing", "marketing"),
            ("Technology", "tech"),
            ("Operations", "operations"),
            ("Legal", "legal"),
        ]:
            r = await db.execute(select(Department).where(Department.slug == slug))
            if r.scalar_one_or_none() is None:
                db.add(Department(name=name, slug=slug))
        r = await db.execute(select(User).where(User.email == "admin@gmail.com"))
        if r.scalar_one_or_none() is None:
            db.add(
                User(
                    email="admin@gmail.com",
                    hashed_password=hash_password("admin123"),
                    role=UserRole.admin,
                )
            )
        await db.commit()

    async with async_session_maker() as db:
        sparse = get_sparse_store()
        await sparse.rebuild_all(db)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    await seed()
    yield


settings = get_settings()
app = FastAPI(title="Enterprise AI Copilot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(departments.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}
