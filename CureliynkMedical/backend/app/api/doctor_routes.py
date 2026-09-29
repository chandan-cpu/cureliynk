from fastapi import APIRouter, HTTPException, status

from app.schemas.doctor_schema import DoctorCreate
from app.services.doctor_service import DoctorService


router = APIRouter(
    prefix="/api/v1/doctors",
    tags=["Doctors"],
)


doctor_service = DoctorService()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def create_doctor(doctor: DoctorCreate):

    try:
        result = doctor_service.create_doctor(
            doctor.model_dump()
        )

        return {
            "message": "Doctor record inserted successfully",
            "doctor": result,
        }

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to insert doctor record",
        )