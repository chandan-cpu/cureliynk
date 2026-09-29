from app.providers.mongodb_doctor_provider import (
    MongoDBDoctorProvider
)


class DoctorService:

    def __init__(self, provider=None):

        self.provider = (
            provider
            or MongoDBDoctorProvider()
        )

    def create_doctor(self, doctor_data: dict):

        return self.provider.insert_doctor(
            doctor_data
        )