from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Department
from app.schemas import DepartmentOut

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
async def list_departments(db: Annotated[AsyncSession, Depends(get_db)]) -> list[Department]:
    result = await db.execute(select(Department).order_by(Department.name))
    return list(result.scalars().all())
