import { ContextItemWithId, Range, SlashCommand } from "../..";
import { IAgent, runAgent } from "../../agent";
import EditTool from "../../agent/tools/edit";
import { addLineNumber } from "../../util/lineNumber";
import { contextItemToRangeInFileWithContents } from "../util";

/// Generate prompt for editing.
function getContext(content: string, range: Range, request: string): string {
  return `You are an autonomous programmer. Below is some code for you to edit:

\`\`\`
${addLineNumber(content)}
\`\`\`

Your task is to edit the code, in order to "${request}".

You can only edit between lines ${range.start.line}-${range.end.line}.`;
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
    const context = getContext(fullFileContents, rif.range, request);
    for await (const message of runAgent(agent, context)) {
      yield message;
    }
  },
};

export default EditPlusSlashCommand;
