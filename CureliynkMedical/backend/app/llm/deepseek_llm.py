"""
DeepSeek LLM Provider

Provides a simple interface for communicating with
the DeepSeek API.
"""

from openai import OpenAI

from app.config.settings import settings


class DeepSeekLLM:

    def __init__(
        self,
        model=None,
        api_key=None,
    ):
        """
        Initialize the DeepSeek client.
        """

        self.model_name = (
            model
            or settings.DEEPSEEK_MODEL
        )

        self.api_key = (
            api_key
            or settings.DEEPSEEK_API_KEY
        )

        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.deepseek.com",
        )

    def generate(
        self,
        system_prompt,
        user_prompt,
        json_mode=False,
    ):
        """
        Generate a response using DeepSeek.
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

            "temperature": 0,

            "stream": False,
        }

        # -----------------------------------------
        # JSON mode
        # -----------------------------------------

        if json_mode:

            request["response_format"] = {
                "type": "json_object"
            }

        # -----------------------------------------
        # Call DeepSeek
        # -----------------------------------------

        response = self.client.chat.completions.create(
            **request
        )

        # -----------------------------------------
        # Return generated text
        # -----------------------------------------

        return response.choices[0].message.content