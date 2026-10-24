"""Meta endpoints (nutrient registry, etc.)."""

from fastapi import APIRouter

from app.nutrients import NUTRIENTS
from app.schemas.entry import NutrientRead

router = APIRouter()


@router.get("/nutrients", response_model=list[NutrientRead])
async def list_nutrients() -> list[NutrientRead]:
    return [
        NutrientRead(
            code=n.code,
            name=n.name,
            unit=n.unit,
            daily_value=n.daily_value,
        )
        for n in NUTRIENTS
    ]
