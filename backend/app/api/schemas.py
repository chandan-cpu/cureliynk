from pydantic import BaseModel, Field


class MedicalQueryRequest(BaseModel):

    query: str = Field(...,min_length=1,description="Medical question from the user",)

    latitude: float = Field(...,ge=-90,le=90,description="User's latitude for location",)

    longitude: float = Field(...,ge=-180,le=180,description="User's longitude for location",)
    language: str = "en"

# Nearby specialist

class NearbySpecialist(BaseModel):

    name: str

    speciality: str

    doctor_type: str

    distance: float

    location: str

# Medical response

class MedicalQueryResponse(BaseModel):

    query: str

    medical_specialty: str

    doctor_type: str

    urgency: str

    confidence: float

    nearby_specialists: list[NearbySpecialist] = Field(default_factory=list)