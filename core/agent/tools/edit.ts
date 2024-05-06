import {
  ITool,
  ToolStep,
  matchRegex,
  matchCodeBlock,
  matchAssert,
  matchString,
  resultError,
  resultBreak,
} from ".";
import { addLineNumber, removeLineNumber } from "../../util/lineNumber";

/// Parameters for Edit tool
interface EditToolParams {
  /// Requested edit action
  request: string;

  /// Line range to begin edit
  boundStart: number;

  /// Line range to end edit
  boundEnd: number;

  /// Full file content
  fileContent: string;

  /// Callback to show diff in the editor
  showDiff: (newContents: string) => void;
}

/// Format the indent of a code according to a reference
/// (typically the code before edit)
function formatIndent(code: string, ref: string): string {
  // Trim code and reference
  const trimmedCode = code.trimEnd();
  const trimmedRef = ref.trimEnd();

  // Split code and reference by line
  const codeLines = trimmedCode.split("\n");
  const refLines = trimmedRef.split("\n");

  // Fail if code and reference have different line count
  if (codeLines.length !== refLines.length) {
    return code;
  }

  // For each line, make sure code has same indent with refence
  let formattedCode = [];
  for (let i = 0; i < codeLines.length; i++) {
    const codeLine = codeLines[i];
    const refLine = refLines[i];
    const indentLine = refLine.match(/^\s*/)![0];
    formattedCode.push(indentLine + codeLine.trim());
  }

  return formattedCode.join("\n");
}

/// Tool for editing code
export default class EditTool implements ITool {
  readonly name: string;
  readonly intent: string;
  readonly format: string;
  readonly prefix: string;
  readonly params: EditToolParams;

  // Persistent state
  fileContent: string;

  // Ephermeral state
  steps: ToolStep[];
  currentStep: number = 0;
  rangeStart: number = 0;
  rangeEnd: number = 0;
  codeReference: string = "";
  codeBefore: string = "";
  codeAfter: string = "";

  constructor(params: EditToolParams) {
    this.name = "edit";
    this.intent = `edit the code`;
    this.prefix = "1. I'll only edit";
    this.format = `
1. I'll only edit lines that require changes.
2. I'll only edit inside lines ${params.boundStart}-${params.boundEnd}.
3. With those in mind, I choose to edit lines X-Y.
4. Before edit, the code in lines X-Y is:

\`\`\`
(code)
\`\`\`

5. After editing to "${params.request}", the code will be:

\`\`\`
(code)
\`\`\`

`;
    this.params = params;
    this.fileContent = params.fileContent;
    this.steps = [];
  }

  reset(): void {
    this.currentStep = 0;
    this.rangeStart = 0;
    this.rangeEnd = 0;
    this.codeReference = "";
    this.codeBefore = "";
    this.codeAfter = "";

    // Steps are stateful, so they require rebuild
    this.steps = this.buildSteps();
  }

  getSuccessMessage(): string {
    return `Successfully edited lines ${this.rangeStart}-${this.rangeEnd}!

Current code is:

\`\`\`
${addLineNumber(this.fileContent)}
\`\`\`

`;
  }

  getEditedCode(): string {
    // Get real code parts
    const realCodeLines = this.fileContent.split("\n");
    const realCodePrefix = realCodeLines
      .slice(0, this.rangeStart - 1)
      .join("\n");
    const realCodeSuffix = realCodeLines.slice(this.rangeEnd).join("\n");

    // Get edited code
    return realCodePrefix + "\n" + this.codeAfter + realCodeSuffix;
  }

  buildSteps(): ToolStep[] {
    return [
      matchString("1.", `I'll only edit lines that require changes.`),
      matchString(
        "2.",
        `I'll only edit inside lines ${this.params.boundStart}-${this.params.boundEnd}.`,
      ),
      matchRegex(
        "3.",
        /With those in mind, I choose to edit lines (\d+)-(\d+)./i,
        (match) => {
          // Set range
          this.rangeStart = parseInt(match[1]);
          this.rangeEnd = parseInt(match[2]);

          // Check range validity
          if (
            this.rangeStart < this.params.boundStart ||
            this.rangeEnd > this.params.boundEnd ||
            this.rangeStart > this.rangeEnd
          ) {
            return resultError(`You want to edit lines ${this.rangeStart}-${this.rangeEnd}, 
but it's invalid because you can only edit between ${this.params.boundStart}-${this.params.boundEnd}!
Please provide a valid range!`);
          }
          return resultBreak(
            `Got edit range: ${this.rangeStart}-${this.rangeEnd}!`,
          );
        },
      ),
      matchRegex(
        "4.",
        /Before edit, the code in lines (\d+)-(\d+) is/i,
        (match) => {
          // Check consistency
          if (
            this.rangeStart !== parseInt(match[1]) ||
            this.rangeEnd !== parseInt(match[2])
          ) {
            return resultError(`You quoted lines ${match[1]}-${match[2]} as the code before edit, 
but it's unaccepted because you want to edit ${this.rangeStart}-${this.rangeEnd}!
Please quote range consistently!`);
          }
          return resultBreak(`Edit range is confirmed!`);
        },
      ),
      matchCodeBlock((line) => {
        // Accumulate code before
        this.codeBefore += line + "\n";
      }),
      matchAssert(async () => {
        // Get real code in one-indexed range
        this.codeReference = this.fileContent
          .split("\n")
          .slice(this.rangeStart - 1, this.rangeEnd)
          .join("\n")
          .trimEnd();

        // Remove line number from llm-generated code
        this.codeBefore = formatIndent(
          removeLineNumber(this.codeBefore),
          this.codeReference,
        );

        // Ensure code before is consistent with real code
        if (this.codeBefore !== this.codeReference) {
          return resultError(`You replied that the code in ${this.rangeStart}-${this.rangeEnd} is:

\`\`\`
${this.codeBefore}
\`\`\`

It's not accepted because it's inconsistent with the real code:

\`\`\`
${this.codeReference}
\`\`\`

Please provide the correct code before edit!`);
        }
        return resultBreak("Code before edit is consistent with real code!");
      }),
      matchString(
        "5.",
        `After editing to "${this.params.request}", the code will be`,
      ),
      matchCodeBlock((line) => {
        // Accumulate code after
        this.codeAfter += removeLineNumber(line).trimEnd() + "\n";

        // Show diff
        this.params.showDiff(this.getEditedCode());
      }),
      matchAssert(async () => {
        // Store edited code as file content
        this.fileContent = this.getEditedCode();
        return resultBreak("Stored edited code!");
      }),
    ];
  }
}
