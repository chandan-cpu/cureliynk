from functools import lru_cache

from app.config.settings import settings

from app.core.retriever import load_model,load_collection


from app.core.reranker import load_reranker

from app.core.bm25_retriever import load_bm25

from app.core.doctor_router import DoctorRouter

from app.llm.deepseek_llm import DeepSeekLLM

from app.services.application import MedicalApplication


@lru_cache(maxsize=1)
def get_application():
    "load all models at oneces"

    #load embedding models
    embedding_model = load_model()

    #load reranker
    reranker = load_reranker(settings.DEVICE)

    #load_database

    chroma = load_collection()

    # load BM25

    bm25, bm25_documents = load_bm25(settings.CHUNK_DATA)

    #ollama models
    llm = DeepSeekLLM()

    application = MedicalApplication(embedding_model=embedding_model,chroma=chroma,bm25=bm25,reranker=reranker,
                                     bm25_documents=bm25_documents,
                                     llm=llm,
    )

    return application