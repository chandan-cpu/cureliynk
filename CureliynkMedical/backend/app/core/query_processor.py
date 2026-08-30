import re


INTENT_SECTIONS = {

    "symptoms": ["symptoms","signs and symptoms","signs",],

    "causes": ["causes","risk factors",],

    "diagnosis": ["diagnosis","diagnostic","exams and tests","tests","testing",],

    "treatment": ["treatment","home care","self care","self-care","patient instructions","when to contact a medical professional","when to call the doctor","when to call","management",],

    "prevention": ["prevention","preventing",],
}

STOP_WORDS = {

    "i", "me", "my","you", "your","a", "an", "the","is", "am", "are","was", "were","be", "been","do", "does", "did","what", "which", "who",
    "how","this", "that","these", "those","of", "to", "from","in", "on", "at","for", "with", "by","and", "or", "but","have", "has", "had",
    "can", "could","should", "would","next","please",
        }

SPELLING_CORRECTIONS = {
                "symtom": "symptom","symtoms": "symptoms","symptm": "symptom","symptms": "symptoms",

                "diabtes": "diabetes","diabetis": "diabetes","diabete": "diabetes","fevire": "fever","feaver": "fever","fevr": "fever",

                "migrane": "migraine","migrain": "migraine","presure": "pressure","presssure": "pressure","sefering": "suffering",
                "suferring": "suffering","sufferng": "suffering","diagnozed": "diagnosed","diagnosd": "diagnosed","tretment": "treatment",
                "treament": "treatment","preventon": "prevention",
}


SYMPTOM_PATTERNS = [r"\bi have\b",r"\bi am having\b",r"\bi am suffering\b",r"\bi'm having\b",r"\bi'm suffering\b",r"\bsuffering from\b",

    r"\bfor \d+ days?\b",r"\blast \d+ days?\b",r"\bfor (one|two|three|four|five|six|seven) days?\b",r"\blast (one|two|three|four|five|six|seven) days?\b",
]


def normalize_query(query):

    query = query.lower().strip()

    query = re.sub(r"[^a-z0-9\s']"," ",query)

    query = re.sub(r"\s+"," ",query)

    return query.strip()

# Correct known spelling mistakes

def correct_spelling(query):

    words = query.split()

    corrected_words = []

    for word in words:

        corrected_word = SPELLING_CORRECTIONS.get(word,word)

        corrected_words.append(corrected_word)

    return " ".join(corrected_words)

# Intent detection

def detect_intent(query):

    query = query.lower()

    # Symptoms
    if re.search(r"\b("r"symptom|symptoms|"r"sign|signs"r")\b",query):

        return "symptoms"

    # Causes

    if re.search(r"\b("r"cause|causes|caused|" r"causing|why|" r"risk|risks" r")\b",query):

        return "causes"

    # Diagnosis
    # Important fix:
    # diagnosed was missing previously.

    if re.search(r"\b(" r"diagnose|" r"diagnosed|" r"diagnosing|" r"diagnosis|" r"diagnostic|" r"test|tests|" r"tested|testing|" r"exam|exams" r")\b",query):

        return "diagnosis"

    # Prevention

    if re.search(r"\b(" r"prevent|" r"prevents|" r"preventing|" r"prevention|" r"avoid|" r"avoiding|" r"reduce risk" r")\b",query):

        return "prevention"

    # Explicit treatment / management request

    if re.search( r"\b(" r"treat|" r"treated|" r"treating|" r"treatment|" r"medicine|" r"medicines|" r"medication|" r"medications|" r"therapy|" r"manage|"
        r"management|" r"care|" r"help" r")\b", query):

        return "treatment"

    # Natural treatment questions

    treatment_phrases = [
                        "what should i do","what do i do","what i do","what to do","how can i get better","how do i get better","how can i improve",
                        "how i improve","how to improve","how can i recover","how do i recover",
                        ]


    if any( phrase in query for phrase in treatment_phrases):

        return "treatment"

    # Patient describing current symptoms/problem

    if any(re.search(pattern, query) for pattern in SYMPTOM_PATTERNS):

        return "treatment"
    
    return "general"

# Extract useful BM25 keywords

def extract_keywords(query):

    words = re.findall(r"\b[a-z0-9]+\b", query.lower())

    keywords = []

    for word in words:

        if word in STOP_WORDS:
            continue

        if len(word) <= 1:
            continue

        keywords.append(
            word
        )

    return keywords

# Build BM25 query

def build_bm25_query(query):

    normalized = normalize_query(query)

    corrected = correct_spelling(normalized)

    keywords = extract_keywords(corrected)

    return " ".join(keywords)

# Get preferred sections

def get_preferred_sections(intent):

    return INTENT_SECTIONS.get(intent,[])

# Process complete user query

def process_query(query):

    # Original user input
    original_query = query

    # Normalize

    normalized_query = normalize_query(query)

    # Correct known spelling mistakes

    corrected_query = correct_spelling(normalized_query)

    # Detect intent using corrected query

    intent = detect_intent(corrected_query)

    # Extract BM25 keywords

    keywords = extract_keywords(corrected_query)


    bm25_query = " ".join(keywords)


    return {

        "original_query":original_query,

        "normalized_query":normalized_query,

        "corrected_query":corrected_query,

        "bm25_query":bm25_query,

        "keywords":keywords,

        "intent":intent,
    }