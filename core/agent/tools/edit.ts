import { ITool, ToolStep, matchRegex, matchCodeBlock, matchAssert } from ".";
import { removeLineNumber } from "../../util/lineNumber";

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
  let trimmedCode = code.trimEnd();
  let trimmedRef = ref.trimEnd();

  // Split code and reference by line
  let codeLines = trimmedCode.split("\n");
  let refLines = trimmedRef.split("\n");

  // Fail if code and reference have different line count
  if (codeLines.length !== refLines.length) {
    return code;
  }

  // For each line, make sure code has same indent with refence
  let formattedCode = [];
  for (let i = 0; i < codeLines.length; i++) {
    let codeLine = codeLines[i];
    let refLine = refLines[i];
    let indentLine = refLine.match(/^\s*/)![0];
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
  readonly step: ToolStep[];

  currentStep: number = 0;
  rangeStart: number = 0;
  rangeEnd: number = 0;
  codeReference: string = "";
  codeBefore: string = "";
  codeAfter: string = "";

  constructor(params: EditToolParams) {
    this.name = "edit";
    this.intent = `edit the code`;
    this.prefix = "I want to edit";
    this.format = `I want to edit lines X-Y. 
    
I'm sure it's inside lines ${params.boundStart}-${params.boundEnd}. 

Before edit, the code in lines X-Y is:

\`\`\`
(code)
\`\`\`

After editing to "${params.request}", the code is:

\`\`\`
(code)
\`\`\``;
    this.params = params;
    this.step = [
      matchRegex(/I want to edit lines (\d+)-(\d+)/i, (match) => {
        // Set range
        this.rangeStart = parseInt(match[1]);
        this.rangeEnd = parseInt(match[2]);

        // Check range validity
        if (
          this.rangeStart < this.params.boundStart ||
          this.rangeEnd > this.params.boundEnd ||
          this.rangeStart > this.rangeEnd
        ) {
          return {
            status: "error",
            message: `Range should be in ${this.params.boundStart}-${this.params.boundEnd}, but your range is ${this.rangeStart}-${this.rangeEnd}!`,
          };
        }
        return {
          status: "break",
          message: `Got edit range: ${this.rangeStart}-${this.rangeEnd}!`,
        };
      }),
      matchRegex(/I'm sure it's inside lines/i), // TODO check line number
      matchRegex(/Before edit, the code in lines (\d+)-(\d+) is/i, (match) => {
        // Check consistency
        if (
          this.rangeStart !== parseInt(match[1]) ||
          this.rangeEnd !== parseInt(match[2])
        ) {
          return {
            status: "error",
            message: `Range ${this.rangeStart}-${this.rangeEnd} is inconsistent with ${match[3]}-${match[4]}!`,
          };
        }
        return {
          status: "break",
          message: `Edit range is confirmed!`,
        };
      }),
      matchCodeBlock((line) => {
        // Accumulate code before
        this.codeBefore += line + "\n";
      }),
      matchAssert(() => {
        // Get real code in one-indexed range
        this.codeReference = this.params.fileContent
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
          return {
            status: "error",
            message: `Real code before edit is:

\`\`\`
${this.codeReference}
\`\`\`

What you provided is:

\`\`\`
${this.codeBefore}
\`\`\`

They are not consistent, so your edit is invalid.`,
          };
        }
        return {
          status: "break",
          message: "Code before edit is consistent with real code!",
        };
      }),
      matchRegex(/After editing to/i),
      matchCodeBlock((line) => {
        // Accumulate code after
        this.codeAfter += line + "\n";

        // Remove line number from llm-generated code
        this.codeAfter = removeLineNumber(this.codeAfter);

        // Get real code parts
        let realCodeLines = this.params.fileContent.split("\n");
        let realCodePrefix = realCodeLines
          .slice(0, this.rangeStart - 1)
          .join("\n");
        let realCodeSuffix = realCodeLines.slice(this.rangeEnd).join("\n");

        // Get edited code
        let editedCode =
          realCodePrefix + "\n" + this.codeAfter + realCodeSuffix;

        // Show diff
        this.params.showDiff(editedCode);
      }),
    ];
  }
}
