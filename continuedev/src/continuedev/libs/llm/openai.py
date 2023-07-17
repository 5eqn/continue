from functools import cached_property
from typing import Any, Coroutine, Dict, Generator, List, Union

from ...core.main import ChatMessage
import openai
from ..llm import LLM
from ..util.count_tokens import compile_chat_messages, CHAT_MODELS, DEFAULT_ARGS, count_tokens, prune_raw_prompt_from_top
from ...core.config import AzureInfo


class OpenAI(LLM):
    api_key: str
    default_model: str

    def __init__(self, api_key: str, default_model: str, system_message: str = None, azure_info: AzureInfo = None):
        self.api_key = api_key
        self.default_model = default_model
        self.system_message = system_message
        self.azure_info = azure_info

        openai.api_key = api_key

        # Using an Azure OpenAI deployment
        if azure_info is not None:
            openai.api_type = "azure"
            openai.api_base = azure_info.endpoint
            openai.api_version = azure_info.api_version

    @cached_property
    def name(self):
        return self.default_model

    @property
    def default_args(self):
        args = {**DEFAULT_ARGS, "model": self.default_model}
        if self.azure_info is not None:
            args["engine"] = self.azure_info.engine
        return args

    def count_tokens(self, text: str):
        return count_tokens(self.default_model, text)

    async def stream_complete(self, prompt, with_history: List[ChatMessage] = [], **kwargs) -> Generator[Union[Any, List, Dict], None, None]:
        args = self.default_args.copy()
        args.update(kwargs)
        args["stream"] = True

        if args["model"] in CHAT_MODELS:
            async for chunk in await openai.ChatCompletion.acreate(
                messages=compile_chat_messages(
                    args["model"], with_history, args["max_tokens"], prompt, functions=None, system_message=self.system_message),
                **args,
            ):
                if "content" in chunk.choices[0].delta:
                    yield chunk.choices[0].delta.content
                else:
                    continue
        else:
            async for chunk in await openai.Completion.acreate(prompt=prompt, **args):
                yield chunk.choices[0].text

    async def stream_chat(self, messages: List[ChatMessage] = [], **kwargs) -> Generator[Union[Any, List, Dict], None, None]:
        args = self.default_args.copy()
        args.update(kwargs)
        args["stream"] = True
        args["model"] = self.default_model if self.default_model in CHAT_MODELS else "gpt-3.5-turbo-0613"
        if not args["model"].endswith("0613") and "functions" in args:
            del args["functions"]

        async for chunk in await openai.ChatCompletion.acreate(
            messages=compile_chat_messages(
                args["model"], messages, args["max_tokens"], functions=args.get("functions", None), system_message=self.system_message),
            **args,
        ):
            yield chunk.choices[0].delta

    async def complete(self, prompt: str, with_history: List[ChatMessage] = [], **kwargs) -> Coroutine[Any, Any, str]:
        args = {**self.default_args, **kwargs}

        if args["model"] in CHAT_MODELS:
            resp = (await openai.ChatCompletion.acreate(
                messages=compile_chat_messages(
                    args["model"], with_history, args["max_tokens"], prompt, functions=None, system_message=self.system_message),
                **args,
            )).choices[0].message.content
        else:
            resp = (await openai.Completion.acreate(
                prompt=prune_raw_prompt_from_top(
                    args["model"], prompt, args["max_tokens"]),
                **args,
            )).choices[0].text

        return resp
