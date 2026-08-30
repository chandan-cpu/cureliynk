import json
import re

DOCTOR_ROUTER_PROMPT = """
You are a medical specialty routing assistant.

Your job is NOT to diagnose the patient and NOT to prescribe treatment.

Your job is to determine:

1. Which medical specialty best matches the user's problem.
2. Which doctor type should evaluate that problem.
3. How urgent the evaluation may be.

You receive:
- the user's query
- retrieved medical evidence

=========================================================
SPECIALTY ROUTING
=========================================================

Always identify the medical specialty independently from urgency.

Examples of routing categories:

General adult health problem:
General Medicine
General Physician / Internist

Baby or child with a general medical problem:
Pediatrics
Pediatrician

Pregnancy or prenatal problem:
Obstetrics & Gynecology
Obstetrician / Gynecologist (OB-GYN)

Heart-related problem:
Cardiology
Cardiologist

Known heart rhythm / arrhythmia problem:
Cardiac Electrophysiology
Electrophysiologist

Child with a supported heart-related problem:
Pediatric Cardiology
Pediatric Cardiologist

Neurological problem:
Neurology
Neurologist

Child with a supported neurological problem:
Pediatric Neurology
Pediatric Neurologist

Skin problem:
Dermatology
Dermatologist

Eye problem:
Ophthalmology
Ophthalmologist

Ear, nose, or throat problem:
Otolaryngology (ENT)
ENT Specialist / Otolaryngologist

Bone, joint, or musculoskeletal problem:
Orthopedics
Orthopedic Specialist

Digestive system problem:
Gastroenterology
Gastroenterologist

Kidney problem:
Nephrology
Nephrologist

Urinary or male reproductive system problem:
Urology
Urologist

Lung or respiratory problem:
Pulmonology
Pulmonologist

Hormonal/endocrine problem:
Endocrinology
Endocrinologist

Known infectious disease requiring specialist evaluation:
Infectious Diseases
Infectious Disease Specialist

=========================================================
IMPORTANT ROUTING RULES
=========================================================

Do NOT diagnose the user.

Do NOT assume the user has a disease simply because a
retrieved document discusses that disease.

Retrieved documents are supporting evidence, not diagnoses.

Use the user's age group, stated symptoms, known conditions,
and relevant retrieved evidence.

If the patient is a baby or child, prefer Pediatrics unless
there is enough evidence for a pediatric subspecialty.

Example:

baby + fever
→ Pediatrics
→ Pediatrician

Do NOT route:

baby + fever
→ Infectious Diseases

unless there is specific information supporting that
specialist referral.

For adult broad or nonspecific symptoms, prefer General
Medicine when there is insufficient evidence for a specialty.

Use a subspecialty only when the query or evidence supports
that level of specificity.

Example:

irregular heartbeat alone
→ Cardiology
→ Cardiologist

known diagnosed arrhythmia requiring rhythm specialist
→ Cardiac Electrophysiology
→ Electrophysiologist

=========================================================
URGENCY
=========================================================

Urgency is COMPLETELY SEPARATE from specialty.

Allowed urgency:

routine
soon
urgent
emergency

If the situation appears urgent or emergency, DO NOT replace
the medical specialty with Emergency Medicine.

For example:

chest pain + shortness of breath

Correct:

medical_specialty: Cardiology
doctor_type: Cardiologist
urgency: emergency

Not:

medical_specialty: Emergency Medicine
doctor_type: Emergency Physician

Urgency describes how quickly medical evaluation may be
needed.

Specialty describes which medical branch is relevant.

=========================================================
SAFETY
=========================================================

Do not prescribe medication.
Do not provide dosages.
Do not invent diagnoses.
Do not exaggerate urgency.

When specialist routing is uncertain, choose the appropriate
general specialty rather than inventing a subspecialty.

=========================================================
OUTPUT
=========================================================

Return ONLY valid JSON:

{
    "medical_specialty": "string",
    "doctor_type": "string",
    "urgency": "routine | soon | urgent | emergency",
    "reason": "short explanation based on user information and relevant evidence",
    "confidence": 0.0
}

confidence must be between 0 and 1.

Do not return markdown.
Do not return text outside the JSON.
"""


# =========================================================
# Build Retrieval Context
# =========================================================

def build_context(
    results,
    max_results=5
):

    if not results:

        return (
            "No relevant medical context was retrieved."
        )

    blocks = []

    for index, result in enumerate(
        results[:max_results],
        start=1
    ):

        metadata = result.get(
            "metadata",
            {}
        )

        title = metadata.get(
            "title",
            "Unknown"
        )

        section = metadata.get(
            "section",
            "Unknown"
        )

        document = result.get(
            "document",
            ""
        )

        final_score = result.get(
            "final_score"
        )

        block = [
            f"SOURCE {index}",
            f"Title: {title}",
            f"Section: {section}",
        ]

        if final_score is not None:

            try:

                block.append(
                    f"Retrieval score: "
                    f"{float(final_score):.4f}"
                )

            except (
                TypeError,
                ValueError
            ):

                pass

        block.append(
            f"Medical content:\n{document}"
        )

        blocks.append(
            "\n".join(block)
        )

    return "\n\n".join(
        blocks
    )


# =========================================================
# Build Doctor Routing Prompt
# =========================================================

def build_doctor_prompt(
    query,
    results
):

    context = build_context(
        results=results,
        max_results=5
    )

    return f"""
USER QUERY:

{query}


RETRIEVED MEDICAL EVIDENCE:

{context}


TASK:

Determine the most appropriate medical specialty,
doctor type, and urgency for this user.


=========================================================
ROUTING PRIORITY
=========================================================

First identify important facts directly stated by the user:

1. Patient age group
2. Pregnancy status if stated
3. Known diagnosed conditions
4. Main symptoms/problem
5. Relevant retrieved medical evidence

The USER QUERY has priority for facts explicitly stated
by the user.

Retrieved evidence supports routing but must not override
explicit patient information.


=========================================================
AGE ROUTING
=========================================================

If the patient is clearly a baby or child:

General medical problems should route to:

Pediatrics
Pediatrician

NOT:

General Medicine
General Physician / Internist


Example:

3-year-old child + fever + cough

→ Pediatrics
→ Pediatrician


Use a pediatric subspecialty only when the problem
reasonably supports one.

Example:

child + known heart condition

→ Pediatric Cardiology
→ Pediatric Cardiologist


=========================================================
ADULT ROUTING
=========================================================

For an adult with broad or nonspecific symptoms and no
supported specialist condition:

→ General Medicine
→ General Physician / Internist


=========================================================
SPECIALIST ROUTING
=========================================================

When the user's problem clearly corresponds to a specialty,
route to that specialty.

Examples:

heart-related problem
→ Cardiology
→ Cardiologist

known arrhythmia requiring rhythm specialist
→ Cardiac Electrophysiology
→ Electrophysiologist

skin problem
→ Dermatology
→ Dermatologist

neurological problem
→ Neurology
→ Neurologist


Do not invent a subspecialty when there is insufficient
evidence.


=========================================================
RETRIEVAL SAFETY
=========================================================

Retrieved documents may discuss diseases the user does
NOT have.

Do not diagnose the user based on retrieved documents.

For example:

fever + retrieved pneumonia article

does NOT mean:

patient has pneumonia


Use retrieved content only as supporting medical evidence.


=========================================================
URGENCY
=========================================================

Determine urgency independently from specialty.

Allowed values:

routine
soon
urgent
emergency


Emergency urgency must NOT replace the specialty.

Example:

chest pain + shortness of breath

medical_specialty:
Cardiology

doctor_type:
Cardiologist

urgency:
emergency


=========================================================
REASON
=========================================================

Explain why the specialty is appropriate.

Do NOT speculate about possible diagnoses unless the user
explicitly states a known diagnosis.

For example, for:

3-year-old child + fever + cough

say:

"The patient is a young child with general acute symptoms,
so pediatric evaluation is appropriate."

Do NOT say:

"This may be a viral infection or bacterial infection."


Return ONLY the required JSON object.
""".strip()

def extract_json(text):

    if not text:
        return None

    text = str(text).strip()

    # Remove possible markdown fences

    text = re.sub(r"^```json\s*","",text,flags=re.IGNORECASE)

    text = re.sub(r"^```\s*","",text)

    text = re.sub(r"\s*```$","",text)

    text = text.strip()

    # Try direct JSON

    try:

        return json.loads(text)

    except json.JSONDecodeError:

        pass

    # Fallback
    # Find JSON object inside response

    match = re.search(r"\{.*\}",text,flags=re.DOTALL)

    if not match:
        return None

    try:
        return json.loads(match.group(0))

    except json.JSONDecodeError:

        return None

# Safe Fallback

# Safe Fallback

def get_fallback_result():

    return { "medical_specialty":"General Medicine","doctor_type":"General Physician / Internist","urgency":"routine",

        "reason":"The available information is not specific ""enough for specialist routing.",
        "confidence":0.0}

def validate_result(data):

    fallback = get_fallback_result()

    if not isinstance(data, dict):
        return fallback

    # Specialty

    specialty = str(
        data.get("medical_specialty","")).strip()

    if not specialty:
        specialty = fallback["medical_specialty"]

    # Doctor Type

    doctor_type = str(data.get("doctor_type","")).strip()

    if not doctor_type:
        doctor_type = fallback["doctor_type"]


    # Urgency

    urgency = str(data.get("urgency","routine")).lower().strip()

    allowed_urgency = {"routine","soon","urgent","emergency"}

    if urgency not in allowed_urgency:
        urgency = "routine"

    # Reason

    reason = str(data.get("reason","")).strip()

    if not reason:
        reason = fallback["reason"]

    # Confidence

    try:
        confidence = float(data.get("confidence",0.0))

    except (TypeError, ValueError):
        confidence = 0.0


    confidence = max(0.0,min(confidence,1.0))


    # IMPORTANT:
    #
    # Low confidence does NOT change specialty.
    #
    # Confidence describes model certainty.
    # It must not overwrite Pediatrics, Cardiology,
    # Dermatology, etc.


    return {
        "medical_specialty":
            specialty,

        "doctor_type":
            doctor_type,

        "urgency":
            urgency,

        "reason":
            reason,

        "confidence":
            round(
                confidence,
                3
            )
    }

# Parse LLM Response
#
# Provider independent:
# Ollama / Gemini / Groq / OpenAI can all return text.

def parse_response(response):

    if response is None:

        return get_fallback_result()


    # Provider wrapper should normally return string.

    if isinstance(response,str):

        text = response

    else:text = str(response)


    data = extract_json(text)

    return validate_result(data)


# Route Doctor
#
# IMPORTANT:
#
# This function does NOT know whether the LLM is
# Ollama, Gemini, Groq, OpenAI, etc.
#
# Every provider only needs:
#
# llm.generate(
#     system_prompt,
#     user_prompt,
#     json_mode=True
# )

def route_doctor(query,retrieval_results,llm):

    if not query:

        raise ValueError("Query cannot be empty.")


    if retrieval_results is None:

        retrieval_results = []


    user_prompt = build_doctor_prompt(query=query,results=retrieval_results)


    try:

        response = llm.generate(system_prompt=DOCTOR_ROUTER_PROMPT,user_prompt=user_prompt,json_mode=True)


    except Exception as error:

        print("\nLLM routing error:")
        print(error)

        return get_fallback_result()


    return parse_response(response)

# Display Doctor Recommendation

def display_doctor_route(result):

    print("\n"+ "=" * 60)

    print("DOCTOR ROUTING RESULT")

    print("=" * 60)

    print(f"Medical Specialty : "f"{result['medical_specialty']}")

    print(f"Doctor Type : "f"{result['doctor_type']}")

    print(f"Urgency: "f"{result['urgency']}")

    print(f"Confidence : "f"{result['confidence']:.3f}")

    print(f"Reason : "f"{result['reason']}")

    print("=" * 60)

    # =========================================================
# Doctor Router Class
# =========================================================

class DoctorRouter:

    def __init__(self, llm):
        """
        Initialize the doctor router.

        The router is independent of the LLM provider.
        It can work with Ollama, Gemini, Groq, etc.
        """

        self.llm = llm

    def route(
        self,
        query: str,
        retrieval_results,
    ):
        """
        Route the user's query to the appropriate
        medical specialty and doctor type.
        """

        return route_doctor(
            query=query,
            retrieval_results=retrieval_results,
            llm=self.llm,
        )