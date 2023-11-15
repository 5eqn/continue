from typing import List, Optional

from pydantic import validator

from ...core.main import ChatMessage
from ..util.count_tokens import CONTEXT_LENGTH_FOR_MODEL
from .base import LLM
from .openai import OpenAI
from .proxy_server import ProxyServer


class OpenAIFreeTrial(LLM):
    """
    With the `OpenAIFreeTrial` `LLM`, new users can try out Continue with GPT-4 using a proxy server that securely makes calls to OpenAI using our API key. Continue should just work the first time you install the extension in VS Code.

    Once you are using Continue regularly though, you will need to add an OpenAI API key that has access to GPT-4 by following these steps:

    1. Copy your API key from https://platform.openai.com/account/api-keys
    2. Open `~/.continue/config.json`. You can do this by using the '/config' command in Continue
    3. Change the default LLMs to look like this:

    ```json title="~/.continue/config.json"
    {
        "models": [
            {
                "title": "GPT-4",
                "provider": "openai",
                "model": "gpt-4",
                "api_key": "YOUR_API_KEY"
            },
            {
                "title": "GPT-3.5-Turbo",
                "provider": "openai",
                "model": "gpt-3.5-turbo",
                "api_key": "YOUR_API_KEY"
            }
        ],
        "model_roles": {
            "default": "GPT-4",
            "summarize": "GPT-3.5-Turbo"
        }
    }
    ```
    """

    llm: Optional[LLM] = None

    @validator("context_length", pre=True, always=True)
    def context_length_for_model(cls, v, values):
        return CONTEXT_LENGTH_FOR_MODEL.get(values["model"], 4096)

    def update_llm_properties(self):
        if self.llm is not None:
            self.llm.system_message = self.system_message

    async def start(self, unique_id: Optional[str] = None):
        await super().start(unique_id=unique_id)
        if self.api_key is None or self.api_key.strip() == "":
            self.llm = ProxyServer(
                model=self.model,
                verify_ssl=self.request_options.verify_ssl,
                ca_bundle_path=self.request_options.ca_bundle_path,
            )
        else:
            self.llm = OpenAI(
                api_key=self.api_key,
                model=self.model,
                verify_ssl=self.request_options.verify_ssl,
                ca_bundle_path=self.request_options.ca_bundle_path,
            )

        await self.llm.start(unique_id=unique_id)

    async def stop(self):
        await self.llm.stop()

    async def _complete(self, prompt: str, options):
        self.update_llm_properties()
        return await self.llm._complete(prompt, options)

    async def _stream_complete(self, prompt, options):
        self.update_llm_properties()
        resp = self.llm._stream_complete(prompt, options)
        async for item in resp:
            yield item

    async def _stream_chat(self, messages: List[ChatMessage], options):
        self.update_llm_properties()
        resp = self.llm._stream_chat(messages=messages, options=options)
        async for item in resp:
            yield item

    def count_tokens(self, text: str):
        return self.llm.count_tokens(text)
