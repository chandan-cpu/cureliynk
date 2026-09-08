"""
Translation Service

Translates the medical response into the language selected by the user, using
the same LLM the rest of the pipeline runs on.

Two rules shape this module:

* Only the text a human reads is translated. `urgency` stays a canonical
  English code, and the specialty is carried through in English as well as in
  the user's language, because the mobile app switches its emergency UI and
  its doctor search on those values.
* A translation failure degrades to English rather than failing the request.
  A user who asked in Assamese and gets an English answer has been helped;
  one who gets a 500 has not.
"""

import logging
import threading


logger = logging.getLogger(__name__)


LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "as": "Assamese",
    "bn": "Bengali",
}


# Specialty and doctor-type strings come from a fixed vocabulary and repeat on
# almost every request, so their translations are worth keeping. The reason
# text is unique per user and is never cached.
_CACHE_LIMIT = 512


class TranslationService:

    def __init__(self, llm):
        self.llm = llm

        self._cache: dict[tuple[str, str], str] = {}

        self._cache_lock = threading.Lock()

    # -----------------------------------------------------
    # Single strings
    # -----------------------------------------------------

    def translate_text(self, text: str, language: str) -> str:
        """
        Translate one string, returning the original if that is not possible.
        """

        if not text or language == "en":
            return text

        target_language = LANGUAGE_NAMES.get(language)

        if target_language is None:
            # Should be unreachable: the request schema restricts `language`
            # to the supported set.
            return text

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

        user_prompt = f"""
Translate the following medical text into {target_language}.

Text:
{text}
"""

        try:
            response = self.llm.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
            )

        except Exception:
            # Never log the text itself - it is the user's symptom
            # description.
            logger.exception(
                "Translation to %s failed; returning the English text.",
                language,
            )

            return text

        translated = (response or "").strip()

        return translated or text

    def _translate_cached(self, text: str, language: str) -> str:
        """
        `translate_text` for values from a small fixed vocabulary, such as
        "Cardiology" or "Pediatrician".
        """

        if not text or language == "en":
            return text

        key = (language, text)

        with self._cache_lock:
            cached = self._cache.get(key)

        if cached is not None:
            return cached

        translated = self.translate_text(text, language)

        with self._cache_lock:
            # Plain size cap rather than an LRU: the vocabulary is small
            # enough that eviction order does not matter.
            if len(self._cache) >= _CACHE_LIMIT:
                self._cache.clear()

            self._cache[key] = translated

        return translated

    # -----------------------------------------------------
    # Whole result
    # -----------------------------------------------------

    def translate_result(self, result: dict, language: str) -> dict:
        """
        Translate the user-facing parts of a pipeline result.

        Always sets `doctor["medical_specialty_code"]` to the canonical
        English specialty, in every language including English, so callers
        have one field they can always match on.
        """

        translated = dict(result)

        doctor = dict(result.get("doctor") or {})

        # Canonical, never translated. Set before anything else so it survives
        # an early return.
        doctor["medical_specialty_code"] = doctor.get("medical_specialty", "")

        if language == "en":
            translated["doctor"] = doctor

            return translated

        doctor["medical_specialty"] = self._translate_cached(
            doctor.get("medical_specialty", ""),
            language,
        )

        doctor["doctor_type"] = self._translate_cached(
            doctor.get("doctor_type", ""),
            language,
        )

        # `urgency` is deliberately NOT translated. It is a machine-readable
        # code ("routine" | "soon" | "urgent" | "emergency") that the mobile
        # app compares against to decide whether to show the emergency banner
        # and the ambulance button; a translated value would silently disable
        # both.

        doctor["reason"] = self.translate_text(
            doctor.get("reason", ""),
            language,
        )

        translated["doctor"] = doctor

        # Nearby specialists.
        #
        # Only the two vocabulary fields are translated, and both go through
        # the cache - a list of ten providers nearly always shares one
        # specialty, so this is two LLM calls rather than twenty.
        #
        # Names, addresses and coordinates stay exactly as the provider gave
        # them: a translated clinic name is not something anyone can act on.
        specialists = []

        for provider in result.get("nearby_specialists", []) or []:
            provider_copy = dict(provider)

            provider_copy["speciality"] = self._translate_cached(
                provider.get("speciality", ""),
                language,
            )

            provider_copy["doctor_type"] = self._translate_cached(
                provider.get("doctor_type", ""),
                language,
            )

            specialists.append(provider_copy)

        translated["nearby_specialists"] = specialists

        return translated
