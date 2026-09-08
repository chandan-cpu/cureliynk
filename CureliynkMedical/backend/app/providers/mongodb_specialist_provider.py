import logging
import os

from pymongo import MongoClient
from dotenv import load_dotenv


load_dotenv()

logger = logging.getLogger(__name__)


class MongoDBSpecialistProvider:
    """
    The local doctor database, used when the maps search finds nobody in
    range.
    """

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

        if not mongo_uri:
            logger.warning(
                "MONGODB_URI is not set. The local doctor database will "
                "return no results."
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

            # Rows come from a hand-maintained collection, so a missing field
            # is normal. The API contract requires a name and a location, and
            # a row that cannot supply either is not worth showing.
            name = (doctor.get("doctor_name") or "").strip()

            facility = (doctor.get("facility") or "").strip()

            if not name:
                continue

            specialty_name = (
                doctor.get("specialty") or specialty
            )

            specialists.append({
                "name": name,
                "speciality": specialty_name,
                "doctor_type": specialty_name,
                # These rows carry no coordinates, so there is no distance to
                # report. `None` is honest; 0.0 would read as "right here".
                "distance": None,
                "location": facility or "Address unavailable",
            })

        return specialists
