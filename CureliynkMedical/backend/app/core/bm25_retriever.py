import json
import re

from rank_bm25 import BM25Okapi


STOP_WORDS = {"i", "me", "my", "myself","we", "our", "ours","you", "your", "yours","he", "she", "it", "they", "them","a", "an", "the",

    "is", "am", "are", "was", "were","be", "been", "being","do", "does", "did","what", "which", "who","this", "that", "these", "those",
    "for", "from", "to", "of","in", "on", "at", "by", "with","and", "or", "but","have", "has", "had","next"
}


def tokenize(text):

    tokens = re.findall(r"\b[a-zA-Z0-9]+\b",text.lower())

    return [
        token
        for token in tokens
        if token not in STOP_WORDS and len(token) > 1
    ]


def load_bm25(chunk_file):

    documents = []

    with open(chunk_file,"r",encoding="utf-8") as file:

        for line in file:

            line = line.strip()

            if not line:
                continue

            item = json.loads(line)

            documents.append(item)

    corpus = [tokenize(
            f"{item.get('title', '')} "
            f"{item.get('section', '')} "
            f"{item.get('text', '')}")
        for item in documents
    ]

    bm25 = BM25Okapi(corpus)

    return bm25, documents


def bm25_retrieve(query,bm25,documents,top_k=30):

    query_tokens = tokenize(query)

    if not query_tokens:
        return []

    scores = bm25.get_scores(query_tokens)

    top_indices = sorted(range(len(scores)),key=lambda i: scores[i],reverse=True)[:top_k]

    results = []

    for index in top_indices:

        score = float(scores[index])

        if score <= 0:
            continue

        item = documents[index]

        results.append({

            "document": item["text"],

            "metadata": {
                "doc_id": item["doc_id"],
                "title": item["title"],
                "section": item["section"],
                "chunk_id": item["chunk_id"],
                "source": item["source"],
                "language": item.get(
                    "language",
                    "en"
                )
            },

            "bm25_score": score
        })

    return results