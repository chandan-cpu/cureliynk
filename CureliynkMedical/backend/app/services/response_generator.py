FINAL_RESPONSE_PROMPT = """
You generate a short result message for a medical specialist-finder application.

The medical system has already analyzed the user's query and selected a specialist.

Your job is ONLY to create one short, natural message that appears above
the nearby specialist results.

Rules:
1. Understand the user's concern from the query.
2. Mention the selected specialty naturally.
3. Do not diagnose.
4. Do not give medical advice.
5. Do not mention treatment or medication.
6. Do not ask questions.
7. Do not mention AI, RAG, retrieval, or internal systems.
8. Do not sound like a chatbot.
9. Do not say "I understand".
10. Make it sound like a helpful search-result/SMS message.
11. Keep it to ONE sentence.

Example:

Query:
I have fever

Specialty:
General Medicine

Good:
"We found General Medicine specialists near you who can help with your concern."

Another example:

Query:
My skin is itchy and I have a rash

Specialty:
Dermatology

Good:
"We found Dermatology specialists near you for the skin concern you described."

Return ONLY valid JSON:

{
    "message": "..."
}
"""

def generate_final_response(query, doctor_result, llm):
    user_prompt = f"""
USER QUERY:
{query}

SELECTED SPECIALTY:
{doctor_result.get("medical_specialty", "General Medicine")}

DOCTOR TYPE:
{doctor_result.get("doctor_type", "General Physician / Internist")}

Generate the short result message.
"""

    return llm.generate(
        system_prompt=FINAL_RESPONSE_PROMPT,
        user_prompt=user_prompt,
        json_mode=True
    )