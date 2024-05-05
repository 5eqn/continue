import { ContextItemWithId, ILLM, Range, SlashCommand } from "../..";
import { IAgent, runAgent } from "../../agent";
import EditTool from "../../agent/tools/edit";
import { getMarkdownLanguageTagForFile } from "../../util";
import { addLineNumber } from "../../util/lineNumber";
import PromptBuilder from "../../util/promptBuilder";
import { contextItemToRangeInFileWithContents } from "../util";

/// Generate prompt for editing.
function getPromptBuilder(
  model: ILLM,
  code: string,
  language: string,
  range: Range,
  request: string,
): PromptBuilder {
  // Get code parts
  const codeWithLineNumber = addLineNumber(code);
  const codeList = codeWithLineNumber.split("\n");
  const prefixLength = range.start.line - 1;
  const suffixLength = codeList.length - range.end.line;

  // Build message
  const BUFFER_FOR_FUNCTIONS = 400;
  const promptBuilder = new PromptBuilder(
    model,
    model.contextLength / 2 - BUFFER_FOR_FUNCTIONS,
  );
  promptBuilder.addUserMessage(
    `You are an autonomous programmer. Below is some code for you to edit:`,
  );
  promptBuilder.addUserMessage(`\n\`\`\`${language}`);

  // Prefix has higher priority, closer to edit area means higher priority
  for (let i = 0; i < prefixLength; i++) {
    promptBuilder.addUserMessage(codeList[i], i + suffixLength + 1);
  }

  // Edit area should not be deleted
  for (let i = prefixLength; i < range.end.line; i++) {
    promptBuilder.addUserMessage(codeList[i]);
  }

  // Suffix has lower priority, farther from edit area means lower priority
  for (let i = range.end.line; i < codeList.length; i++) {
    promptBuilder.addUserMessage(codeList[i], codeList.length - i);
  }

  // Rest of the message
  promptBuilder.addUserMessage(`\`\`\``);
  promptBuilder.addUserMessage(
    `\nYour task is to edit between lines ${range.start.line}-${range.end.line}, in order to "${request}".`,
  );
  return promptBuilder;
}

const EditPlusSlashCommand: SlashCommand = {
  name: "edit+",
  description: "Enhanced editing",
  run: async function* ({ ide, llm, input, contextItems }) {
    // Get request text
    const request = input.match(/\/edit\+\s*(.*)/)?.[1]?.trim() || "";
    if (request.length === 0) {
      yield "💀 Please provide a request. For example, `/edit+ implement this function`.\n\n";
      return;
    }
    yield `🤣 Got request: "${request}"...\n\n`;

    // Get code to edit
    let contextItemToEdit = contextItems.find(
      (item: ContextItemWithId) =>
        item.editing && item.id.providerTitle === "code",
    );
    if (!contextItemToEdit) {
      contextItemToEdit = contextItems.find(
        (item: ContextItemWithId) => item.id.providerTitle === "code",
      );
    }
    if (!contextItemToEdit) {
      yield "💀 Error: Please highlight the code you want to edit, then press `cmd/ctrl+shift+L` to add it to chat\n\n";
      return;
    }
    const rif = contextItemToRangeInFileWithContents(contextItemToEdit);
    await ide.saveFile(rif.filepath);
    let fullFileContents = await ide.readFile(rif.filepath);

    // Build agent
    const agent: IAgent = {
      llm,
      tools: [
        () =>
          new EditTool({
            request,
            boundStart: rif.range.start.line,
            boundEnd: rif.range.end.line,
            fileContent: fullFileContents,
            showDiff: (fileContent) => {
              ide.showDiff(rif.filepath, fileContent, 1);
            },
          }),
      ],
    };

    // Run agent
    const promptBuilder = getPromptBuilder(
      llm,
      fullFileContents,
      getMarkdownLanguageTagForFile(rif.filepath),
      rif.range,
      request,
    );
    for await (const message of runAgent(agent, promptBuilder)) {
      yield message;
    }
  },
};

export default EditPlusSlashCommand;
