import os
from typing import Coroutine, List, Optional, Union


from ..models.filesystem import RangeInFile
from ..models.filesystem_edit import (
    AddDirectory,
    AddFile,
    DeleteDirectory,
    DeleteFile,
    FileEdit,
    FileSystemEdit,
)
from ..models.main import Range
from ..server.protocols.ide_protocol import AbstractIdeProtocolServer
from ..server.protocols.gui_protocol import AbstractGUIProtocolServer
from .config import ContinueConfig
from .lsp import ContinueLSPClient
from .main import (
    ChatMessage,
    Context,
    ContextItem,
    ContextItemId,
    ContinueCustomException,
    Step,
    StepDescription,
    StepGenerator,
)
from .models import Models
from .steps import (
    DefaultModelEditCodeStep,
    FileSystemEditStep,
    RangeInFileWithContents,
    ShellCommandsStep,
    WaitForUserConfirmationStep,
)


class Autopilot:
    pass


class ContinueSDK:
    """The SDK provided as parameters to a step"""

    ide: AbstractIdeProtocolServer
    gui: AbstractGUIProtocolServer
    config: ContinueConfig
    models: Models

    lsp: Optional[ContinueLSPClient] = None
    context: Context = Context()

    __autopilot: Autopilot

    def __init__(
        self,
        config: ContinueConfig,
        ide: AbstractIdeProtocolServer,
        gui: AbstractGUIProtocolServer,
        autopilot: Autopilot,
    ):
        self.ide = ide
        self.gui = gui
        self.config = config
        self.models = config.models
        self.__autopilot = autopilot

    @property
    def history(self) -> List[StepDescription]:
        return self.__autopilot.session_state.history

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

    async def run_step(self, step: Step) -> StepGenerator:
        async for update in self.__autopilot.run_step(step):
            yield update

    async def apply_filesystem_edit(
        self, edit: FileSystemEdit, name: str = None, description: str = None
    ):
        return await self.run_step(
            FileSystemEditStep(
                edit=edit, description=description, **({"name": name} if name else {})
            )
        )

    async def wait_for_user_confirmation(self, prompt: str):
        return await self.run_step(WaitForUserConfirmationStep(prompt=prompt))

    async def run(
        self,
        commands: Union[List[str], str],
        cwd: str = None,
        name: str = None,
        description: str = None,
        handle_error: bool = True,
    ) -> Coroutine[str, None, None]:
        commands = commands if isinstance(commands, List) else [commands]
        return (
            await self.run_step(
                ShellCommandsStep(
                    cmds=commands,
                    cwd=cwd,
                    description=description,
                    handle_error=handle_error,
                    **({"name": name} if name else {}),
                )
            )
        ).text

    async def edit_file(
        self,
        filename: str,
        prompt: str,
        name: str = None,
        description: str = "",
        range: Range = None,
    ):
        filepath = await self._ensure_absolute_path(filename)

        await self.ide.setFileOpen(filepath)
        contents = await self.ide.readFile(filepath)
        await self.run_step(
            DefaultModelEditCodeStep(
                range_in_files=[
                    RangeInFile(filepath=filepath, range=range)
                    if range is not None
                    else RangeInFile.from_entire_file(filepath, contents)
                ],
                user_input=prompt,
                description=description,
                **({"name": name} if name else {}),
            )
        )

    async def append_to_file(self, filename: str, content: str):
        filepath = await self._ensure_absolute_path(filename)
        previous_content = await self.ide.readFile(filepath)
        file_edit = FileEdit.from_append(filepath, previous_content, content)
        await self.ide.applyFileSystemEdit(file_edit)

    async def add_file(self, filename: str, content: Union[str, None]):
        filepath = await self._ensure_absolute_path(filename)
        dir_name = os.path.dirname(filepath)
        os.makedirs(dir_name, exist_ok=True)
        return await self.run_step(
            FileSystemEditStep(edit=AddFile(filepath=filepath, content=content))
        )

    async def delete_file(self, filename: str):
        filename = await self._ensure_absolute_path(filename)
        return await self.run_step(
            FileSystemEditStep(edit=DeleteFile(filepath=filename))
        )

    async def add_directory(self, path: str):
        path = await self._ensure_absolute_path(path)
        return await self.run_step(FileSystemEditStep(edit=AddDirectory(path=path)))

    async def delete_directory(self, path: str):
        path = await self._ensure_absolute_path(path)
        return await self.run_step(FileSystemEditStep(edit=DeleteDirectory(path=path)))

    def get_code_context(
        self, only_editing: bool = False
    ) -> List[RangeInFileWithContents]:
        highlighted_ranges = self.__autopilot.context_manager.context_providers[
            "code"
        ].highlighted_ranges
        context = (
            list(filter(lambda x: x.item.editing, highlighted_ranges))
            if only_editing
            else highlighted_ranges
        )
        return [c.rif for c in context]

    async def add_context_item(self, item: ContextItem):
        await self.__autopilot.context_manager.manually_add_context_item(item)

    async def delete_context_item(self, id: ContextItemId):
        await self.__autopilot.delete_context_with_ids(
            [f"{id.provider_title}-{id.item_id}"]
        )

    def set_loading_message(self, message: str):
        # self.__autopilot.set_loading_message(message)
        raise NotImplementedError()

    def raise_exception(
        self, message: str, title: str, with_step: Union[Step, None] = None
    ):
        raise ContinueCustomException(message, title, with_step)

    async def get_chat_context(self) -> List[ChatMessage]:
        history_context = list(
            map(
                lambda step: ChatMessage(
                    role="assistant",
                    name=step.step_type,
                    content=step.description or f"Ran function {step.name}",
                    summary=f"Called function {step.name}",
                ),
                self.history,
            )
        )

        context_messages: List[
            ChatMessage
        ] = []  # await self.__autopilot.context_manager.get_chat_messages()
        # TODO

        # Insert at the end, but don't insert after latest user message or function call
        for msg in context_messages:
            history_context.insert(-1, msg)

        return history_context
