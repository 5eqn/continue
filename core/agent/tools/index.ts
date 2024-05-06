/// Interface of a tool
export interface ITool {
  /// Name of the tool
  readonly name: string;

  /// What the LLM wants when it chooses the tool
  readonly intent: string;

  /// Format hint of the tool
  readonly format: string;

  /// If one reply line has this prefix, the tool will be chosen
  readonly prefix: string;

  /// Steps to complete the tool
  readonly step: ToolStep[];

  /// Current step index
  currentStep: number;
}

/// Step function of a tool
/// `line`: current line
/// `last`: if this is the last line (if last, error if not matched)
export type ToolStep = (line: string, last: boolean) => StepResult;

/// Run tool with line input
export function runTool(tool: ITool, line: string, last: boolean): StepResult {
  // If all steps are done, complete
  if (tool.currentStep >= tool.step.length) {
    return resultComplete;
  }

  // Call current step
  let result = tool.step[tool.currentStep](line, last);

  // If break and next step exists, move to next step
  if (result.status === "break") {
    tool.currentStep++;
  }

  // Return result of last step
  return result;
}

/// Result of a tool step
export type StepResult =
  | {
      status: "continue";
    }
  | {
      status: "complete";
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "break";
      message: string;
    };

/// Result builders
export const resultContinue: StepResult = { status: "continue" };
export const resultComplete: StepResult = { status: "complete" };
export function resultBreak(message: string): StepResult {
  return { status: "break", message };
}
export function resultError(message: string): StepResult {
  return { status: "error", message };
}

/// Matchers
export function matchAssert(condition: () => StepResult): ToolStep {
  return condition;
}
export function matchRegex(
  regex: RegExp,
  callback?: (match: RegExpMatchArray) => StepResult,
): ToolStep {
  return (line, last) => {
    // Match regex
    let match = line.match(regex);

    // Break if regex match
    if (match) {
      let message = "";
      if (callback) return callback(match);
      return resultBreak("");
    }

    // Error if last line
    if (last) {
      return resultError(`Expected "${regex}" to be found in your reply!`);
    }

    // Otherwise just continue matching the next line
    return resultContinue;
  };
}
export function matchCodeBlock(onCode: (line: string) => void): ToolStep {
  let begun = false;
  return (line, last) => {
    // If already begun, this closes the code block
    if (begun && line.startsWith("```")) {
      if (begun) {
        return resultBreak("");
      }
    }

    // Callback code if begun
    if (begun) {
      onCode(line);
    }

    // If didn't begin, begin if encounter code block
    if (!begun && line.startsWith("```")) {
      begun = true;
    }

    // If last line, error if code doesn't complete
    if (last) {
      return resultError("Expected code block in your reply!");
    }

    // Otherwise continue matching the next line
    return resultContinue;
  };
}
