from medical_crawler.run_medical_assistant import (
    load_application,
    process_query,
)


class MedicalService:

    def __init__(self):

        print("Loading AI Medical Assistant...")

        self.app_state = load_application()

        print("Medical Assistant Ready.")

    def ask(
        self,
        query: str
    ):

        return process_query(
            query=query,
            app=self.app_state
        )


medical_service = MedicalService()