from typing import Optional
from pydantic import BaseModel
from ..libs.llm import LLM


class Models(BaseModel):
    """Main class that holds the current model configuration"""
    default: LLM
    small: Optional[LLM] = None
    medium: Optional[LLM] = None
    large: Optional[LLM] = None

    """
    Better to have sdk.llm.stream_chat(messages, model="claude-2").
    Then you also don't care that it' async.
    And it's easier to add more models.
    And intermediate shared code is easier to add.
    And you can make constants like ContinueModels.GPT35 = "gpt-3.5-turbo"
    PromptTransformer would be a good concept: You pass a prompt or list of messages and a model, then it outputs the prompt for that model.
    Easy to reason about, can place anywhere.
    And you can even pass a Prompt object to sdk.llm.stream_chat maybe, and it'll automatically be transformed for the given model.
    This can all happen inside of Models?

    class Prompt:
        def __init__(self, ...info):
            '''take whatever info is needed to describe the prompt'''

        def to_string(self, model: str) -> str:
            '''depending on the model, return the single prompt string'''
    """

    async def _start(llm: LLM):
        kwargs = {}
        if llm.required_api_key:
            kwargs["api_key"] = await self.sdk.get_api_secret(llm.required_api_key)
        await llm.start(**kwargs)

    async def start(sdk: "ContinueSDK"):
        self.sdk = sdk
        self.system_message = self.sdk.config.system_message
        await self._start(self.default)
        if self.small:
            await self._start(self.small)
        else:
            self.small = self.default

        if self.medium:
            await self._start(self.medium)
        else:
            self.medium = self.default

        if self.large:
            await self._start(self.large)
        else:
            self.large = self.default

    async def stop(sdk: "ContinueSDK"):
        await self.default.stop()
        if self.small:
            await self.small.stop()

        if self.medium:
            await self.medium.stop()

        if self.large:
            await self.large.stop()

