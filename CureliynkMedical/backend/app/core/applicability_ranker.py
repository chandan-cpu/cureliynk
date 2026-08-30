import re
from sentence_transformers import CrossEncoder

# Generic topics that do NOT require a diagnosis match

GENERIC_TOPICS = {"fever","headache","cough","vomiting","diarrhea","nausea","dizziness","fatigue","pain","rash","sore throat",}

# Normalize text

def normalize(text):

    text = text.lower()

    text = re.sub(r"[^a-z0-9\s-]"," ",text)

    text = re.sub(r"\s+", " ",text)

    return text.strip()

# Check whether candidate title is supported by query

def topic_support_score(query, title):

    query = normalize(query)
    title = normalize(title)

    if not title:
        return 0.5

    # Exact title mentioned

    if title in query:
        return 1.0
    
    # Generic symptom topic
    # Example:
    # query = "I have fever for 2 days"
    # title = "Fever"

    if title in GENERIC_TOPICS:

        if title in query:
            return 1.0
        
    # Token comparison

    query_tokens = set(re.findall(r"\b[a-z0-9]+\b",query))

    title_tokens = set(re.findall(r"\b[a-z0-9]+\b",title))

    if not title_tokens:
        return 0.5

    overlap = (len(query_tokens & title_tokens)/ len(title_tokens))

    # Strong topic overlap

    if overlap >= 0.75:
        return 1.0

    if overlap >= 0.50:
        return 0.75

    if overlap > 0:
        return 0.40

    # No evidence user mentioned this topic
    return 0.0

# Applicability ranking

def applicability_rank(query,results,model: CrossEncoder,top_k=15):

    if not results:
        return []

    pairs = []

    # Build CrossEncoder pairs

    for result in results:

        meta = result.get("metadata",{})

        title = meta.get("title","")

        section = meta.get("section","")

        document = result.get("document","")

        candidate = (f"Topic: {title}\n" f"Section: {section}\n "f"Content: {document}")

        pairs.append([query,candidate])

    # Semantic applicability

    scores = model.predict(pairs,show_progress_bar=False)

    # Combine semantic + topic support

    for result, semantic_score in zip(results,scores):

        meta = result.get("metadata",{})

        title = meta.get("title","")

        topic_score = topic_support_score(query,title)

        semantic_score = float(semantic_score)

        # Store raw semantic score
        result["semantic_applicability"] = semantic_score

        # Store topic support
        result["topic_support_score"] = topic_score

        # Important:
        #
        # Topic support acts as a gate.
        #
        # A highly relevant treatment document
        # cannot rank highly if its medical
        # condition isn't supported by query.

        if topic_score == 0.0:

            applicability_score = (semantic_score * 0.20)

        elif topic_score <= 0.40:

            applicability_score = (semantic_score * 0.50)

        else:

            applicability_score = (semantic_score* (0.60 + 0.40 * topic_score))

        result["applicability_score"] = applicability_score

    # Sort

    results.sort(key=lambda x: x["applicability_score"],reverse=True)

    return results[:top_k]