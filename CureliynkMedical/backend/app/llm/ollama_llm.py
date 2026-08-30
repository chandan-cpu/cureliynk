"""
Ollama LLM Provider

Provides a simple interface for communicating with
a locally running Ollama server.
"""

from ollama import Client

from app.config.settings import settings


class OllamaLLM:

    def __init__(
        self,
        model=None,
        host=None,
    ):
        """
        Initialize the Ollama client.

        Parameters
        ----------
        model:
            Ollama model name.

        host:
            Ollama server URL.
        """

        self.model_name = (
            model
            or settings.OLLAMA_MODEL
        )

        self.host = (
            host
            or settings.OLLAMA_HOST
        )

        self.client = Client(
            host=self.host
        )

    def generate(
        self,
        system_prompt,
        user_prompt,
        json_mode=False,
    ):
        """
        Generate a response using Ollama.
        """

        request = {
            "model": self.model_name,

            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],

            "options": {
                "temperature": 0,
            },
        }

        if json_mode:
            request["format"] = "json"

        response = self.client.chat(
            **request
        )

        return response[
            "message"
        ][
            "content"
        ]