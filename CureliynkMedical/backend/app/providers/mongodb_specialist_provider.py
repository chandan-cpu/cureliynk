import os

from pymongo import MongoClient
from dotenv import load_dotenv


load_dotenv()


class MongoDBSpecialistProvider:

    def __init__(self):

        mongo_uri = os.getenv("MONGODB_URI")

        database_name = os.getenv(
            "MONGODB_DATABASE",
            "medical_assistant"
        )

        collection_name = os.getenv(
            "MONGODB_COLLECTION",
            "doctors"
        )

        self.client = MongoClient(mongo_uri)

        self.db = self.client[database_name]

        self.collection = self.db[collection_name]

    def find_by_district(self, district, specialty):

        if not district or not specialty:
            return []

        doctors = list(
            self.collection.find(
                {
                    "district": district,
                    "specialty": specialty
                },
                {
                    "_id": 0
                }
            )
        )

        specialists = []

        for doctor in doctors:

            specialists.append({
                "name": doctor.get("doctor_name"),
                "speciality": doctor.get("specialty"),
                "doctor_type": doctor.get("specialty"),
                "distance": 0.0,
                "location": doctor.get("facility")
            })

        return specialists