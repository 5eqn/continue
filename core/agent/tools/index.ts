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
  steps: ToolStep[];

  /// Current step index
  currentStep: number;

  /// Reset tool state
  reset(): void;

  /// Get success message
  getSuccessMessage(): string;
}

/// Step function of a tool
/// `line`: current line
/// `last`: if this is the last line (if last, error if not matched)
export type ToolStep = {
  run(line: string): Promise<StepResult>;
  getErrorMessage(): string;
};

/// Run tool with line input
export async function runTool(tool: ITool, line: string): Promise<StepResult> {
  // If all steps are done, complete
  if (tool.currentStep >= tool.steps.length) {
    return resultContinue;
  }

  // Call current step
  let result = await tool.steps[tool.currentStep].run(line);

  // If break and next step exists, move to next step
  if (result.status === "break") {
    tool.currentStep++;
  }

  // Return result of last step
  return result;
}

/// Check the status (complete or error) of a tool
export function checkToolStatus(tool: ITool): StepResult {
  // If all steps are done, complete
  if (tool.currentStep >= tool.steps.length) {
    return resultComplete(tool.getSuccessMessage());
  }

  // If last step is not complete, return error
  return resultError(tool.steps[tool.currentStep].getErrorMessage());
}

/// Result of a tool step
export type StepResult =
  | {
      status: "continue";
    }
  | {
      status: "complete";
      message: string;
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
export function resultComplete(message: string): StepResult {
  return { status: "complete", message };
}
export function resultBreak(message: string): StepResult {
  return { status: "break", message };
}
export function resultError(message: string): StepResult {
  return { status: "error", message };
}

/// Escape regex
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/// Matchers
export function matchAssert(condition: () => Promise<StepResult>): ToolStep {
  return {
    run: condition,
    getErrorMessage: () => "Assertion failed!",
  };
}
export function matchString(
  prefix: string,
  str: string,
  callback?: () => StepResult,
): ToolStep {
  return matchRegex(prefix, new RegExp(escapeRegex(str), "i"), callback);
}
export function matchRegex(
  prefix: string,
  regex: RegExp,
  callback?: (match: RegExpMatchArray) => StepResult,
): ToolStep {
  return {
    async run(line) {
      // Match prefix
      const prefixMatch = line.match(
        new RegExp(`^${escapeRegex(prefix)}`, "i"),
      );

      // If prefix match, check if regex match
      if (prefixMatch) {
        const regexMatch = line.match(regex);
        if (regexMatch) {
          if (callback) return callback(regexMatch);
          return resultBreak("");
        }
        return resultError(
          `You replied "${line}", 
but it should match "${regex.source}"! 
Please reformat your response correctly!`,
        );
      }

      // Otherwise just continue matching the next line
      return resultContinue;
    },
    getErrorMessage: () =>
      `Your reply is missing "${prefix}"! Please reformat your response correctly!`,
  };
}
export function matchCodeBlock(onCode: (line: string) => void): ToolStep {
  let begun = false;
  return {
    async run(line) {
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

      // Otherwise continue matching the next line
      return resultContinue;
    },
    getErrorMessage: () =>
      "Please reformat your reply to contain a proper code block!",
  };
}
