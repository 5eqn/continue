from functools import cached_property
from typing import Coroutine, Dict, Union
import os

from ..plugins.steps.core.core import DefaultModelEditCodeStep
from ..models.main import Range
from .abstract_sdk import AbstractContinueSDK
from .config import ContinueConfig
from ..models.filesystem_edit import FileEdit, FileSystemEdit, AddFile, DeleteFile, AddDirectory, DeleteDirectory
from ..models.filesystem import RangeInFile
from ..libs.llm import LLM
from .observation import Observation
from ..server.ide_protocol import AbstractIdeProtocolServer
from .main import Context, ContinueCustomException, History, HistoryNode, Step, ChatMessage
from ..plugins.steps.core.core import *
from ..libs.util.telemetry import posthog_logger
from ..libs.util.paths import getConfigFilePath


class Autopilot:
    pass


class Models:
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

    def __init__(self, *, default, small=None, medium=None, large=None, custom=None):
        self.default = default
        self.small = small 
        self.medium = medium
        self.large = large
        self.system_message = sdk.config.system_message

    async def _start(llm: LLM):
        kwargs = {}
        if llm.required_api_key:
            kwargs["api_key"] = await self.sdk.get_api_secret(llm.required_api_key)
        await llm.start(**kwargs)

    async def start(sdk: "ContinueSDK"):
        self.sdk = sdk
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


class ContinueSDK(AbstractContinueSDK):
    """The SDK provided as parameters to a step"""
    ide: AbstractIdeProtocolServer
    models: Models
    context: Context
    config: ContinueConfig
    __autopilot: Autopilot

    def __init__(self, autopilot: Autopilot):
        self.ide = autopilot.ide
        self.__autopilot = autopilot
        self.context = autopilot.context

    @classmethod
    async def create(cls, autopilot: Autopilot) -> "ContinueSDK":
        sdk = ContinueSDK(autopilot)

        try:
            config = sdk._load_config_dot_py()
            sdk.config = config
        except Exception as e:
            print(e)
            sdk.config = ContinueConfig()
            msg_step = MessageStep(
                name="Invalid Continue Config File", message=e.__repr__())
            msg_step.description = e.__repr__()
            sdk.history.add_node(HistoryNode(
                step=msg_step,
                observation=None,
                depth=0,
                active=False
            ))

        sdk.models = sdk.config.models
        await sdk.models.start(sdk)
        return sdk

    @property
    def history(self) -> History:
        return self.__autopilot.history

    def write_log(self, message: str):
        self.history.timeline[self.history.current_index].logs.append(message)

    async def _ensure_absolute_path(self, path: str) -> str:
        if os.path.isabs(path):
            return path

        # Else if in workspace
        workspace_path = os.path.join(self.ide.workspace_directory, path)
        if os.path.exists(workspace_path):
            return workspace_path
        else:
            # Check if it matches any of the open files, then use that absolute path
            open_files = await self.ide.getOpenFiles()
            for open_file in open_files:
                if os.path.basename(open_file) == os.path.basename(path):
                    return open_file
            raise Exception(f"Path {path} does not exist")

    async def run_step(self, step: Step) -> Coroutine[Observation, None, None]:
        return await self.__autopilot._run_singular_step(step)

    async def apply_filesystem_edit(self, edit: FileSystemEdit, name: str = None, description: str = None):
        return await self.run_step(FileSystemEditStep(edit=edit, description=description, **({'name': name} if name else {})))

    async def wait_for_user_input(self) -> str:
        return await self.__autopilot.wait_for_user_input()

    async def wait_for_user_confirmation(self, prompt: str):
        return await self.run_step(WaitForUserConfirmationStep(prompt=prompt))

    async def run(self, commands: Union[List[str], str], cwd: str = None, name: str = None, description: str = None, handle_error: bool = True) -> Coroutine[str, None, None]:
        commands = commands if isinstance(commands, List) else [commands]
        return (await self.run_step(ShellCommandsStep(cmds=commands, cwd=cwd, description=description, handle_error=handle_error, **({'name': name} if name else {})))).text

    async def edit_file(self, filename: str, prompt: str, name: str = None, description: str = "", range: Range = None):
        filepath = await self._ensure_absolute_path(filename)

        await self.ide.setFileOpen(filepath)
        contents = await self.ide.readFile(filepath)
        await self.run_step(DefaultModelEditCodeStep(
            range_in_files=[RangeInFile(filepath=filepath, range=range) if range is not None else RangeInFile.from_entire_file(
                filepath, contents)],
            user_input=prompt,
            description=description,
            **({'name': name} if name else {})
        ))

    async def append_to_file(self, filename: str, content: str):
        filepath = await self._ensure_absolute_path(filename)
        previous_content = await self.ide.readFile(filepath)
        file_edit = FileEdit.from_append(filepath, previous_content, content)
        await self.ide.applyFileSystemEdit(file_edit)

    async def add_file(self, filename: str, content: Union[str, None]):
        filepath = await self._ensure_absolute_path(filename)
        dir_name = os.path.dirname(filepath)
        os.makedirs(dir_name, exist_ok=True)
        return await self.run_step(FileSystemEditStep(edit=AddFile(filepath=filepath, content=content)))

    async def delete_file(self, filename: str):
        filename = await self._ensure_absolute_path(filename)
        return await self.run_step(FileSystemEditStep(edit=DeleteFile(filepath=filename)))

    async def add_directory(self, path: str):
        path = await self._ensure_absolute_path(path)
        return await self.run_step(FileSystemEditStep(edit=AddDirectory(path=path)))

    async def delete_directory(self, path: str):
        path = await self._ensure_absolute_path(path)
        return await self.run_step(FileSystemEditStep(edit=DeleteDirectory(path=path)))

    async def get_api_key(self, env_var: str) -> str:
        # TODO support error prompt dynamically set on env_var
        return await self.ide.getUserSecret(env_var)

    async def get_user_secret(self, env_var: str, prompt: str) -> str:
        return await self.ide.getUserSecret(env_var)

    _last_valid_config: ContinueConfig = None

    def _load_config_dot_py(self) -> ContinueConfig:
        # Use importlib to load the config file config.py at the given path
        path = getConfigFilePath()
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location("config", path)
            config = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(config)
            self._last_valid_config = config.config

            # When the config is loaded, setup posthog logger
            posthog_logger.setup(
                self.ide.unique_id, config.config.allow_anonymous_telemetry or True)

            return config.config
        except Exception as e:
            print("Error loading config.py: ", e)
            return ContinueConfig() if self._last_valid_config is None else self._last_valid_config

    def get_code_context(self, only_editing: bool = False) -> List[RangeInFileWithContents]:
        highlighted_ranges = self.__autopilot.context_manager.context_providers[
            "code"].highlighted_ranges
        context = list(filter(lambda x: x.item.editing, highlighted_ranges)
                       ) if only_editing else highlighted_ranges
        return [c.rif for c in context]

    def set_loading_message(self, message: str):
        # self.__autopilot.set_loading_message(message)
        raise NotImplementedError()

    def raise_exception(self, message: str, title: str, with_step: Union[Step, None] = None):
        raise ContinueCustomException(message, title, with_step)

    async def get_chat_context(self) -> List[ChatMessage]:
        history_context = self.history.to_chat_history()

        context_messages: List[ChatMessage] = await self.__autopilot.context_manager.get_chat_messages()

        # Insert at the end, but don't insert after latest user message or function call
        i = -2 if (len(history_context) > 0 and (
            history_context[-1].role == "user" or history_context[-1].role == "function")) else -1
        for msg in context_messages:
            history_context.insert(i, msg)

        return history_context

    async def update_ui(self):
        await self.__autopilot.update_subscribers()

    async def clear_history(self):
        await self.__autopilot.clear_history()

    def current_step_was_deleted(self):
        return self.history.timeline[self.history.current_index].deleted
