"""
DeepSeek LLM Provider

Provides a simple interface for communicating with
the DeepSeek API.
"""

from openai import OpenAI

from app.config.settings import settings


# Per-call ceiling, in seconds, for both the routing and translation calls.
REQUEST_TIMEOUT_SECONDS = 45.0


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

        # The OpenAI client defaults to a 10-minute timeout. A chat request
        # that hangs that long has already lost the user and is holding a
        # worker thread the whole time, so cap it much lower and let the
        # client retry a transient failure instead.
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.deepseek.com",
            timeout=REQUEST_TIMEOUT_SECONDS,
            max_retries=2,
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