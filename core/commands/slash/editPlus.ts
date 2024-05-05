import { ContextItemWithId, ILLM, Range, SlashCommand } from "../..";
import { IAgent, runAgent } from "../../agent";
import EditTool from "../../agent/tools/edit";
import { addLineNumber } from "../../util/lineNumber";
import { contextItemToRangeInFileWithContents } from "../util";

/// Generate prompt for editing.
function getContext(code: string, range: Range, request: string): string {
  return `You are an autonomous programmer. Below is some code for you to edit:

\`\`\`
${code}
\`\`\`

Your task is to edit between lines ${range.start.line}-${range.end.line}, in order to "${request}".`;
}

/// Generate prompt with pruning.
function getPrunedContext(
  model: ILLM,
  content: string,
  range: Range,
  request: string,
): string {
  const code = addLineNumber(content);
  const codeList = code.split("\n");
  const context = getContext(code, range, request);
  const bufferForFunctions = 400;
  const maxStartLine = range.start.line - 1;
  const minEndLine = range.end.line - 1;

  // Keep track of token count and selection range
  // The 80% total token is added, because the longest conversation is:
  // "context" + "action" + "realCode" + "givenCode" + "action"
  // We reserve space for the later 4 parts
  let totalTokens =
    model.countTokens(context) + bufferForFunctions + model.contextLength * 0.8;
  let curStartLine = 0;
  let curEndLine = codeList.length - 1;

  // Shrink end first
  if (totalTokens > model.contextLength) {
    while (curEndLine > minEndLine) {
      totalTokens -= model.countTokens(codeList[curEndLine]);
      curEndLine--;
      if (totalTokens < model.contextLength) {
        break;
      }
    }
  }

  // If end can no longer be shrunk, shrink from the beginning
  if (totalTokens > model.contextLength) {
    while (curStartLine < maxStartLine) {
      curStartLine++;
      totalTokens -= model.countTokens(codeList[curStartLine]);
      if (totalTokens < model.contextLength) {
        break;
      }
    }
  }

  // Generate new context from shrunk code
  let shrunkCode = codeList.slice(curStartLine, curEndLine + 1).join("\n");
  return getContext(shrunkCode, range, request);
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
    const context = getPrunedContext(llm, fullFileContents, rif.range, request);
    for await (const message of runAgent(agent, context)) {
      yield message;
    }
  },
};

export default EditPlusSlashCommand;
