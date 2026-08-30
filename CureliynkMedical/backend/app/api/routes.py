"""
Medical API Routes
"""

from fastapi import APIRouter, Depends, HTTPException

from app.providers.geoapify_geocoding_provider import GeoapifyGeocondingProvider

from app.api.dependencies import get_application
from app.api.schemas import (
    MedicalQueryRequest,
    MedicalQueryResponse,
)

from app.services.application import MedicalApplication

GeoapifyCode= GeoapifyGeocondingProvider()


router = APIRouter(
    prefix="/api/v1/medical",
    tags=["Medical Assistant"],
)


@router.post(
    "/query",
    response_model=MedicalQueryResponse,
)
def medical_query(
    request: MedicalQueryRequest,
    application: MedicalApplication = Depends(
        get_application
    ),
):
    """
    Process a medical question and determine
    the appropriate medical specialty, doctor type,
    and nearby specialists.
    """

    try:

        # -----------------------------------------
        # Run complete medical application
        # -----------------------------------------

        result = application.ask(
            query=request.query,
            latitude=request.latitude,
            longitude=request.longitude,
            language=request.language,

        )

        # -----------------------------------------
        # Doctor result
        # -----------------------------------------

        doctor = result.get("doctor",{})

        # -----------------------------------------
        # Nearby specialists
        # -----------------------------------------

        nearby_specialists = result.get("nearby_specialists",[])

        # if not nearby_specialists:

        #     userDic = GeoapifyCode.get_location(request.latitude,request.longitude)

        #     print(request.latitude,request.longitude)

        #     print("kam hi gol")

        #     print(userDic)

        return {
            "query": request.query,

            "medical_specialty": doctor.get(
                "medical_specialty",
                "General Medicine"
            ),

            "doctor_type": doctor.get(
                "doctor_type",
                "General Physician / Internist"
            ),

            "urgency": doctor.get(
                "urgency",
                "routine"
            ),

            "reason": doctor.get(
                "reason",
                "Initial medical evaluation is appropriate."
            ),

            "confidence": doctor.get(
                "confidence",
                0.0
            ),

            "nearby_specialists": nearby_specialists,
        }

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:

        print(
            f"Medical query error: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        )