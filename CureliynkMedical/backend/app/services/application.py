"""
Application Bootstrap

Creates the long-lived components required by the
AI Medical Assistant.
"""

import logging

from app.services.translation_service import TranslationService
from app.services.specialist_service import Specialist_Service
from app.providers.geoapify_specialist_provider import (
    GeoapifySpecialistProvider
)
from app.core.medical_retriever import MedicalRetriever
from app.core.doctor_router import DoctorRouter
from app.core.pipeline import MedicalPipeline
from app.providers.geoapify_geocoding_provider import GeoapifyGeocondingProvider
from app.providers.mongodb_specialist_provider import MongoDBSpecialistProvider
from app.services.response_generator import generate_final_response


logger = logging.getLogger(__name__)


# How far out to look for a specialist before falling back to the local
# doctor database.
SEARCH_RADIUS_KM = 10.5

# Most providers to hand back. The chat screen shows the first few and links
# to the full doctor search for the rest, so a longer list only costs
# bandwidth and translation calls.
MAX_NEARBY_SPECIALISTS = 10


class MedicalApplication:

    def __init__(self,embedding_model,chroma,bm25,reranker,bm25_documents,llm,):

        # Store loaded components

        self.embedding_model = embedding_model
        self.chroma = chroma
        self.bm25 = bm25
        self.reranker = reranker
        self.bm25_documents = bm25_documents
        self.llm = llm

        #search doctor in local

        self.MongoDBServices = GeoapifyGeocondingProvider()
        self.MongoDBProvider = MongoDBSpecialistProvider()

        # Translation service

        self.translation_service = TranslationService(llm=self.llm)

        # Medical retriever

        self.retriever = MedicalRetriever(embedding_model=embedding_model,chroma=chroma,bm25=bm25,reranker=reranker,
            bm25_documents=bm25_documents,)

        # Doctor router

        self.router = DoctorRouter(llm=llm)

        self.final_response = generate_final_response

        # Specialist provider

        self.SpecialProvider = GeoapifySpecialistProvider()

        # Specialist service

        self.Services = Specialist_Service(provider=self.SpecialProvider)

        # Medical pipeline

        self.pipeline = MedicalPipeline(retriever=self.retriever,router=self.router,)

    # Main application method

    def ask(self,query: str,latitude: float | None = None,longitude: float | None = None,language: str = "en",):

        # Validate query

        if not query or not query.strip():
            raise ValueError("Medical query cannot be empty.")

        # Run medical pipeline

        result = self.pipeline.process(query=query.strip())

        # Find nearby specialist providers.
        # Location is optional: without it the user still gets a specialty and
        # an urgency, just no doctor list.
        
        result["nearby_specialists"] = self._find_nearby(
                    doctor=result.get("doctor") or {},
                    latitude=latitude,
                    longitude=longitude,
                )

        # Generate natural conversational response

        result["response"] = self.final_response(
            query=query.strip(),
            doctor_result=result.get("doctor") or {},
            llm=self.llm,
        )

        # The retrieval block is the raw knowledge-base text used to reach the
        # recommendation. It is large, it is not shown to anyone, and leaving
        # it on the result means it gets translated and serialised for no
        # reason - so drop it once routing is done.
        result.pop("retrieval", None)


        # Translate final result

        result = self.translation_service.translate_result(result=result,language=language,)

        # Return final response
        print(result)

        return result

    # -----------------------------------------------------
    # Nearby specialists
    # -----------------------------------------------------

    def _find_nearby(self, doctor: dict, latitude, longitude) -> list[dict]:
        """
        Look for providers near the user, maps search first.

        A failure here is never fatal: a recommendation with no doctor list is
        still useful, so every lookup is allowed to come back empty.
        """

        if latitude is None or longitude is None:
            return []

        specialty = doctor.get("medical_specialty")

        if not specialty:
            return []

        try:
            nearby = self.Services.find_nearby_specialist(
                specialty=specialty,
                latitude=latitude,
                longitude=longitude,
                distance_km=SEARCH_RADIUS_KM,
            )

        except Exception:
            # Upstream maps API down, rate limited, or key rejected.
            logger.exception(
                "Nearby specialist search failed; falling back to the local "
                "doctor database."
            )

            nearby = []

        if nearby:
            return nearby[:MAX_NEARBY_SPECIALISTS]

        # Nothing within range from the maps provider - fall back to our own
        # doctor database for the user's district.
        try:
            district = self.MongoDBServices.get_location(
                latitude=latitude,
                longitude=longitude,
            )

            if not district:
                return []

            local = self.MongoDBProvider.find_by_district(
                district=district,
                specialty=specialty,
            )

            return (local or [])[:MAX_NEARBY_SPECIALISTS]

        except Exception:
            logger.exception(
                "Local doctor database lookup failed."
            )

            return []
