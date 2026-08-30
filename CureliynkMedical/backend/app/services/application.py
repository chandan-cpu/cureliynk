"""
Application Bootstrap

Creates the long-lived components required by the
AI Medical Assistant.
"""

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

        # Find nearby specialist providers

        if (latitude is not None and longitude is not None):

            doctor = result.get("doctor") or {}

            specialty = doctor.get("medical_specialty")

            if specialty:

                nearby_specialists = (self.Services.find_nearby_specialist(specialty=specialty,latitude=latitude,longitude=longitude,distance_km=10.5,))

                if not nearby_specialists:
                    district = self.MongoDBServices.get_location(
                        latitude=latitude,
                        longitude=longitude
                    )

                    nearby_specialists_mdb = (
                        self.MongoDBProvider.find_by_district(
                            district=district,
                            specialty=specialty
                        )
                    )
                    result["nearby_specialists"] = nearby_specialists_mdb
                    print(district)
                    print(nearby_specialists_mdb)

                result["nearby_specialists"] = nearby_specialists

        # Debug

        print("LANGUAGE RECEIVED:",language)

        # Translate final result
        print("========== BEFORE translate_result CALL ==========")
        result = self.translation_service.translate_result(result=result,language=language,)
        print("========== AFTER translate_result CALL ==========")

        # Return final response

        return result