"""
Gemini LLM Provider

Provides a simple interface for communicating with
the Google Gemini API.
"""

from google import genai
from google.genai import types

from app.config.settings import settings


class GeminiLLM:

    def __init__(
        self,
        model=None,
        api_key=None,
    ):
        """
        Initialize Gemini client.
        """

        self.model_name = (
            model
            or settings.GEMINI_MODEL
        )

        self.api_key = (
            api_key
            or settings.GEMINI_API_KEY
        )

        self.client = genai.Client(
            api_key=self.api_key
        )

    def generate(
        self,
        system_prompt,
        user_prompt,
        json_mode=False,
    ):
        """
        Generate a response using Gemini.
        """

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0,
        )

        if json_mode:
            config.response_mime_type = "application/json"

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=user_prompt,
            config=config,
        )

        return response.text