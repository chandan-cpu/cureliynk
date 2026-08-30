"""
Medical Pipeline

Central orchestration layer for the AI Medical Assistant.

Flow:

User Query
    ↓
MedicalRetriever
    ↓
Retrieved Medical Evidence
    ↓
DoctorRouter
    ↓
Doctor Recommendation
"""


class MedicalPipeline:

    def __init__(
        self,
        retriever,
        router,
    ):
        """
        Initialize the medical pipeline.

        Parameters
        ----------
        retriever:
            MedicalRetriever instance.

        router:
            DoctorRouter instance.
        """

        self.retriever = retriever
        self.router = router

    def process(
        self,
        query: str,
    ):
        """
        Process a medical query through the complete pipeline.
        """

        # 1. Validate query

        if not query or not query.strip():
            raise ValueError(
                "Medical query cannot be empty."
            )

        query = query.strip()

        # 2. Retrieve medical evidence

        retrieval_results = self.retriever.retrieve(
            query=query
        )

        # 3. Route to appropriate doctor

        doctor_result = self.router.route(
            query=query,
            retrieval_results=retrieval_results,
        )

        # 4. Return result

        return {
            "query": query,
            "doctor": doctor_result,
            "retrieval": retrieval_results,
        }