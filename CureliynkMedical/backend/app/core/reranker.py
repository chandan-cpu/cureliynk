from sentence_transformers import CrossEncoder


RERANKER_MODEL = "BAAI/bge-reranker-base"


def load_reranker(device):

    return CrossEncoder(RERANKER_MODEL,device=device)


def rerank(query, results, model):

    if not results:
        return []

    pairs = []

    for result in results:

        meta = result["metadata"]

        title = meta.get("title", "")
        section = meta.get("section", "")
        document = result["document"]

        context = (
            f"Title: {title}\n"
            f"Section: {section}\n"
            f"Content: {document}"
        )

        pairs.append([
            query,
            context
        ])

    scores = model.predict(
        pairs,
        show_progress_bar=False
    )

    for result, score in zip(
        results,
        scores
    ):
        result["rerank_score"] = float(score)

    results.sort(
        key=lambda x: x["rerank_score"],
        reverse=True
    )

    return results