from chromadb import PersistentClient
from sentence_transformers import SentenceTransformer

from app.config.settings import settings

from app.core.applicability_ranker import applicability_rank
from app.core.query_processor import process_query
from app.core.reranker import load_reranker, rerank
from app.core.context_ranker import context_rank
from app.core.final_ranker import final_rank
from app.core.bm25_retriever import load_bm25, bm25_retrieve

# Load embedding model

def load_model():

    return SentenceTransformer(settings.EMBEDDING_MODEL,device=settings.DEVICE)


# Load ChromaDB collection

def load_collection():

    client = PersistentClient(path=str(settings.CHROMA_DB))

    return client.get_collection(settings.COLLECTION_NAME)

# Vector retrieval

def vector_retrieve(query,model,collection,top_k=40):

    query_embedding = model.encode(query,normalize_embeddings=True,convert_to_numpy=True)

    result = collection.query(query_embeddings=[query_embedding.tolist()],n_results=top_k)

    documents = result["documents"][0]
    metadatas = result["metadatas"][0]
    distances = result["distances"][0]

    results = []

    for doc, meta, distance in zip(documents,metadatas,distances):

        results.append({"document": doc,"metadata": meta,"retrieval_score": 1 - distance})

    return results


# Merge Vector + BM25

def merge_results(vector_results,bm25_results):

    merged = {}

    # Vector results

    for result in vector_results:

        normalized = " ".join(result["document"].lower().split())

        merged[normalized] = result

    # BM25 results

    for result in bm25_results:

        normalized = " ".join(result["document"].lower().split())

        if normalized in merged:

            merged[normalized]["bm25_score"] = (result["bm25_score"])

        else:

            merged[normalized] = result

    return list(merged.values())

# Diversity filter

def diversify(results,top_k=5,max_per_doc=2):

    final_results = []

    doc_counts = {}

    for result in results:

        metadata = result.get("metadata",{})

        doc_id = metadata.get("doc_id")

        # If doc_id is missing,
        # use title as fallback.

        if not doc_id:

            doc_id = metadata.get("title",result.get("document",""))

        count = doc_counts.get(doc_id,0)

        if count >= max_per_doc:
            continue

        final_results.append(
            result
        )

        doc_counts[doc_id] = (
            count + 1
        )

        if len(final_results) >= top_k:
            break

    return final_results

# Display results

def display_results(results):

    if not results:

        print("\nNo relevant results found.")

        return

    for i, result in enumerate(results,start=1):

        meta = result.get("metadata",{})

        print("\n" + "=" * 60)

        print(f"Result: {i}")

        print(f"Title : "f"{meta.get('title', 'Unknown')}")

        print(f"Section: "f"{meta.get('section', 'Unknown')}")

        print(f"Chunk: "f"{meta.get('chunk_id', 'Unknown')}")

        # Vector score

        if "retrieval_score" in result:

            print(f"Vector score : "f"{result['retrieval_score']:.4f}")

        # BM25 score

        if "bm25_score" in result:

            print(f"BM25 score: "f"{result['bm25_score']:.4f}")

        # CrossEncoder score

        if "rerank_score" in result:

            print(f"Rerank score  : "f"{result['rerank_score']:.4f}")

        # Context score

        if "context_score" in result:

            print(f"Context score : "f"{result['context_score']:.4f}")

        # Applicability score

        if "applicability_score" in result:

            print(f"Applicability : "f"{result['applicability_score']:.4f}")

        # Intent score

        if "intent_score" in result:

            print(f"Intent score : "f"{result['intent_score']:.4f}")

        # Final score

        if "final_score" in result:

            print(f"Final score: "f"{result['final_score']:.4f}")

        print("=" * 60)

        print()

        print(result.get("document",""))


# Complete retrieval pipeline

def retrieve(query,embedding_model,reranker_model,collection,bm25_model,bm25_documents,top_k=5):

    # 1. Process query

    processed = process_query(query)

    original_query = processed["original_query"]

    search_query = processed.get("corrected_query",processed["normalized_query"])

    bm25_query = processed["bm25_query"]

    intent = processed["intent"]

    print(f"\nOriginal query : "f"{original_query}")

    print(f"Search query   : "f"{search_query}")

    print(f"BM25 query     : "f"{bm25_query}")

    print(f"Detected intent: "f"{intent}")

    # 2. Vector retrieval

    vector_results = vector_retrieve(query=search_query,model=embedding_model,collection=collection,top_k=40)

    # 3. BM25 retrieval

    bm25_results = bm25_retrieve(query=bm25_query,bm25=bm25_model,documents=bm25_documents,top_k=40)

    # 4. Merge Vector + BM25

    candidates = merge_results(vector_results,bm25_results)

    print(f"Candidates after merge: "f"{len(candidates)}")

    if not candidates:

        return []

    # 5. CrossEncoder reranking

    reranked = rerank(query=search_query,results=candidates,model=reranker_model)

    if not reranked:

        return []

    # 6. Keep strongest candidates

    reranked = reranked[:15]

    # 7. Context ranking

    context_results = context_rank(query=search_query,results=reranked,model=reranker_model,top_k=15)

    if not context_results:

        return []

    # 8. Applicability ranking

    applicable_results = applicability_rank(query=search_query,results=context_results,model=reranker_model,top_k=15)

    if not applicable_results:

        return []

    # 9. Final ranking

    ranked_results = final_rank(results=applicable_results,intent=intent,top_k=15)

    if not ranked_results:

        return []

    # 10. Diversity

    final_results = diversify(results=ranked_results,top_k=top_k,max_per_doc=2)

    return final_results


# Main

def main():

    # Load embedding model

    print("Loading embedding model...")

    embedding_model = load_model()

    # Load CrossEncoder

    print("Loading reranker...")

    reranker_model = load_reranker(settings.DEVICE)

    # Load ChromaDB

    print("Loading ChromaDB...")

    collection = load_collection()

    # Load BM25

    print("Loading BM25 index...")

    bm25_model, bm25_documents = load_bm25(settings.CHUNK_DATA)

    print("\nRetriever ready.")

    # Query loop

    while True:

        query = input("\nEnter your question or Exit: ").strip()

        if query.lower() == "exit":

            print("Exiting...")

            break

        if not query:

            print("Please enter a question.")

            continue

        try:

            results = retrieve(query=query,embedding_model=embedding_model,reranker_model=reranker_model,collection=collection,bm25_model=bm25_model,bm25_documents=bm25_documents,
                top_k=5
            )

            display_results(results)

        except Exception as error:

            print(f"\nRetrieval error: {error}")


# Run

if __name__ == "__main__":

    main()