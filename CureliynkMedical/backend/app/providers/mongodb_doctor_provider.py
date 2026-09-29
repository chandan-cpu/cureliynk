from pymongo import MongoClient

from app.config.settings import settings


class MongoDBDoctorProvider:

    def __init__(self):

        self.client = MongoClient(
            settings.MONGODB_URI
        )

        self.database = self.client[
            settings.MONGODB_DATABASE
        ]

        self.collection = self.database[
            "doctors"
        ]


    def insert_doctor(
        self,
        doctor_data: dict
    ):

        result = self.collection.insert_one(
            doctor_data
        )

        inserted_document = (
            self.collection.find_one(
                {
                    "_id": result.inserted_id
                }
            )
        )

        inserted_document["_id"] = str(
            inserted_document["_id"]
        )

        return inserted_document