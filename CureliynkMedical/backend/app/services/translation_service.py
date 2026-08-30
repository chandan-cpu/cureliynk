"""
Translation Service

Translates the medical response into the language
selected by the user using the existing OllamaLLM.
"""


class TranslationService:

    def __init__(self, llm):
        self.llm = llm
        print("in the translator")

    # Translate one piece of text

    def translate_text(self,text: str,language: str,) -> str:


        # No text

        if not text:

            return text

        # Supported languages

        language_map = {
        "en": "English",
        "hi": "Hindi",
        "as": "Assamese",
        "bn": "Bengali",
        }
        

        target_language = language_map.get(language,"English",)

        # English does not need translation
        
        if language == "en":
            return text
        print("========== STARTING TRANSLATION ==========")
        # Debug

        print("TRANSLATING:")
        print("TEXT:", text)
        print("LANGUAGE:", language)
        print("TARGET:", target_language)

        # System prompt

        system_prompt = f"""
You are a professional medical translator.

Your ONLY task is translation.

TARGET LANGUAGE: {target_language}

STRICT RULES:

1. Translate the input ONLY into {target_language}.
2. The output MUST be written in {target_language}.
3. Do NOT output Hindi when the target language is Assamese.
4. Do NOT output English when the target language is Assamese.
5. Do NOT transliterate the source text.
6. Preserve the original medical meaning.
7. Do not add medical information.
8. Do not remove medical information.
9. Do not provide additional medical advice.
10. Return ONLY the translated text.
"""

        # User prompt

        user_prompt = f"""
Translate the following medical text into {target_language}.

Text:
{text}
"""

        # Use existing OllamaLLM

        response = self.llm.generate(system_prompt=system_prompt,user_prompt=user_prompt,)

        # Debug Ollama response

        print("OLLAMA TRANSLATION RESPONSE:")
        print(response)

        return response

    # Translate complete medical result

    def translate_result(self,result: dict,language: str,) -> dict:

        print("========== ENTERED translate_result ==========")

        # English → no translation

        if language == "en":
            print("========== ENGLISH: RETURNING ==========")
            return result

        # Copy original result
       


        translated = result.copy()

        # Doctor information

        doctor = result.get("doctor") or {}

        translated_doctor = doctor.copy()

        # Medical specialty

        translated_doctor["medical_specialty"] = (
            self.translate_text(
                doctor.get(
                    "medical_specialty",
                    "",
                ),
                language,
            )
        )

        # Doctor type

        translated_doctor["doctor_type"] = (
            self.translate_text(
                doctor.get(
                    "doctor_type",
                    "",
                ),
                language,
            )
        )

        # Urgency

        translated_doctor["urgency"] = (
            self.translate_text(
                doctor.get(
                    "urgency",
                    "",
                ),
                language,
            )
        )

        # Reason

        translated_doctor["reason"] = (
            self.translate_text(
                doctor.get(
                    "reason",
                    "",
                ),
                language,
            )
        )
        # Put translated doctor back

        translated["doctor"] = translated_doctor

        # Nearby specialists

        nearby_specialists = []

        for provider in result.get(
            "nearby_specialists",
            [],
        ):

            provider_copy = provider.copy()

            # Translate speciality

            provider_copy["speciality"] = (
                self.translate_text(
                    provider.get(
                        "speciality",
                        "",
                    ),
                    language,
                )
            )

            # Translate doctor type

            provider_copy["doctor_type"] = (
                self.translate_text(
                    provider.get(
                        "doctor_type",
                        "",
                    ),
                    language,
                )
            )

            # Keep original:
            #
            # name
            # location
            # distance
            # latitude
            # longitude

            nearby_specialists.append(provider_copy)

        # Put nearby specialists back

        translated["nearby_specialists"] = (nearby_specialists)

        # Return translated result

        return translated