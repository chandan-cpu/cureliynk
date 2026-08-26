"""
Claude LLM Provider

Provides a simple interface for communicating with
the Anthropic Claude API.
"""

import anthropic

from app.config.settings import settings


class ClaudeLLM:

    def __init__(
        self,
        model=None,
        api_key=None,
    ):
        self.model_name = (
            model
            or settings.CLAUDE_MODEL
        )

        self.client = anthropic.Anthropic(
            api_key=(
                api_key
                or settings.ANTHROPIC_API_KEY
            )
        )

    def generate(
        self,
        system_prompt,
        user_prompt,
        json_mode=False,
    ):
        """
        Generate a response using Claude.
        """

        response = self.client.messages.create(
            model=self.model_name,
            max_tokens=2048,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": user_prompt,
                }
            ],
        )

        return response.content[0].text