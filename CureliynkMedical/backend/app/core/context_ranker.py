def context_rank(query,results,model,top_k=5):

    if not results:
        return []

    pairs = []

    instruction = (
        "Determine whether the medical passage directly applies "
        "to the user's stated situation. "
        "Do not assume diseases, diagnoses, procedures, age groups, "
        "medications, pregnancy, travel history, or other conditions "
        "that the user did not mention."
    )

    for result in results:

        meta = result["metadata"]

        title = meta.get("title", "")
        section = meta.get("section", "")
        document = result["document"]

        context = (f"Title: {title}\n" f"Section: {section}\n"f"Content: {document}")

        ranking_query = (f"{instruction}\n\n" f"User query: {query}")

        pairs.append([ranking_query,context])

    scores = model.predict(pairs,show_progress_bar=False)

    for result, score in zip(results,scores):

        result["context_score"] = float(score)

    results.sort(key=lambda x: x["context_score"],reverse=True)

    return results[:top_k]