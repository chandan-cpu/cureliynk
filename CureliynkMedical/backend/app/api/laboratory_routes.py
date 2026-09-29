from fastapi import APIRouter, Query

from app.services.laboratory_service import LaboratoryService


router = APIRouter(
    prefix="/api/v1/laboratories",
    tags=["Laboratories"],
)


laboratory_service = LaboratoryService()


@router.get("/nearby")
def get_nearby_laboratories(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_km: float = Query(10.0, gt=0, le=50),
    limit: int = Query(10, gt=0, le=50),
):

    laboratories = laboratory_service.find_nearby(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        limit=limit,
    )

    return {
        "count": len(laboratories),
        "laboratories": laboratories,
    }