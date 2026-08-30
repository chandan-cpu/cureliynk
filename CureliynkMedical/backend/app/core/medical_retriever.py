"""
Medical Retriever

Production wrapper around the existing retrieval pipeline.

The actual retrieval logic remains inside retriever.py.

This class provides a clean interface:

    MedicalRetriever.retrieve(query)

for the MedicalPipeline to use.
"""


from app.core.retriever import (
    retrieve as run_retrieval,
)


class MedicalRetriever:

    def __init__(
        self,
        embedding_model,
        chroma,
        bm25,
        reranker,
        bm25_documents,
    ):
        """
        Initialize the medical retriever.

        Parameters
        ----------
        embedding_model:
            SentenceTransformer embedding model.

        chroma:
            ChromaDB collection.

        bm25:
            Loaded BM25 model.

        reranker:
            Loaded CrossEncoder reranker.

        bm25_documents:
            Documents used by the BM25 index.
        """

        self.embedding_model = embedding_model

        self.index = chroma

        self.bm25 = bm25

        self.reranker = reranker

        self.bm25_documents = bm25_documents


    def retrieve(
        self,
        query: str,
        top_k: int = 5,
    ):
        """
        Retrieve the most relevant medical chunks.

        This method delegates to the existing retrieval
        pipeline in retriever.py.

        Pipeline:

        Query
            ↓
        Query Processing
            ↓
        Vector Retrieval
            ↓
        BM25 Retrieval
            ↓
        Merge
            ↓
        CrossEncoder Reranking
            ↓
        Context Ranking
            ↓
        Applicability Ranking
            ↓
        Final Ranking
            ↓
        Diversity Filtering
        """

        # Validate query

        if not query or not query.strip():

            raise ValueError(
                "Medical query cannot be empty."
            )


        query = query.strip()

        # Run existing retrieval pipeline

        results = run_retrieval(

            query=query,

            embedding_model=self.embedding_model,

            reranker_model=self.reranker,

            index=self.index,

            bm25_model=self.bm25,

            bm25_documents=self.bm25_documents,

            top_k=top_k,
        )

        # Always return a list

        if results is None:

            return []


        return results