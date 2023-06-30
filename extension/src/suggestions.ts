import * as vscode from "vscode";
import { sendTelemetryEvent, TelemetryEvent } from "./telemetry";
import { openEditorAndRevealRange } from "./util/vscode";
import { translate, readFileAtRange } from "./util/vscode";
import * as fs from "fs";
import * as path from "path";

export interface SuggestionRanges {
  oldRange: vscode.Range;
  newRange: vscode.Range;
  newSelected: boolean;
  newContent: string;
}

/* Keyed by editor.document.uri.toString() */
export const editorToSuggestions: Map<
  string, // URI of file
  SuggestionRanges[]
> = new Map();
export const editorSuggestionsLocked: Map<string, boolean> = new Map(); // Map from editor URI to whether the suggestions are locked
export const currentSuggestion: Map<string, number> = new Map(); // Map from editor URI to index of current SuggestionRanges in editorToSuggestions

// When tab is reopened, rerender the decorations:
vscode.window.onDidChangeActiveTextEditor((editor) => {
  if (!editor) return;
  rerenderDecorations(editor.document.uri.toString());
});
vscode.workspace.onDidOpenTextDocument((doc) => {
  rerenderDecorations(doc.uri.toString());
});

const newDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgb(0, 255, 0, 0.1)",
  isWholeLine: true,
});
const oldDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgb(255, 0, 0, 0.1)",
  isWholeLine: true,
  cursor: "pointer",
});
const newSelDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgb(0, 255, 0, 0.25)",
  isWholeLine: true,
  // after: {
  //   contentText: "Press ctrl+shift+enter to accept",
  //   margin: "0 0 0 1em",
  // },
});
const oldSelDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgb(255, 0, 0, 0.25)",
  isWholeLine: true,
  // after: {
  //   contentText: "Press ctrl+shift+enter to reject",
  //   margin: "0 0 0 1em",
  // },
});

export function rerenderDecorations(editorUri: string) {
  const suggestions = editorToSuggestions.get(editorUri);
  const idx = currentSuggestion.get(editorUri);
  const editor = vscode.window.visibleTextEditors.find(
    (editor) => editor.document.uri.toString() === editorUri
  );
  if (!suggestions || !editor) return;

  const rangesWithoutEmptyLastLine = (ranges: vscode.Range[]) => {
    const newRanges: vscode.Range[] = [];
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      if (
        range.start.line === range.end.line &&
        range.start.character === 0 &&
        range.end.character === 0
      ) {
        // Empty range, don't show it
        continue;
      }
      newRanges.push(
        new vscode.Range(
          range.start.line,
          range.start.character,
          // Don't include the last line if it is empty
          range.end.line - (range.end.character === 0 ? 1 : 0),
          range.end.character
        )
      );
    }
    return newRanges;
  };

  let olds: vscode.Range[] = [];
  let news: vscode.Range[] = [];
  let oldSels: vscode.Range[] = [];
  let newSels: vscode.Range[] = [];
  for (let i = 0; i < suggestions.length; i++) {
    const suggestion = suggestions[i];
    if (typeof idx != "undefined" && idx === i) {
      if (suggestion.newSelected) {
        olds.push(suggestion.oldRange);
        newSels.push(suggestion.newRange);
      } else {
        oldSels.push(suggestion.oldRange);
        news.push(suggestion.newRange);
      }
    } else {
      olds.push(suggestion.oldRange);
      news.push(suggestion.newRange);
    }
  }

  // Don't highlight the last line if it is empty
  olds = rangesWithoutEmptyLastLine(olds);
  news = rangesWithoutEmptyLastLine(news);
  oldSels = rangesWithoutEmptyLastLine(oldSels);
  newSels = rangesWithoutEmptyLastLine(newSels);

  editor.setDecorations(oldDecorationType, olds);
  editor.setDecorations(newDecorationType, news);
  editor.setDecorations(oldSelDecorationType, oldSels);
  editor.setDecorations(newSelDecorationType, newSels);

  // Reveal the range in the editor
  if (idx === undefined) return;
  editor.revealRange(
    suggestions[idx].newRange,
    vscode.TextEditorRevealType.Default
  );
}

export function suggestionDownCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const editorUri = editor.document.uri.toString();
  const suggestions = editorToSuggestions.get(editorUri);
  const idx = currentSuggestion.get(editorUri);
  if (!suggestions || idx === undefined) return;

  const suggestion = suggestions[idx];
  if (!suggestion.newSelected) {
    suggestion.newSelected = true;
  } else if (idx + 1 < suggestions.length) {
    currentSuggestion.set(editorUri, idx + 1);
  } else return;
  rerenderDecorations(editorUri);
}

export function suggestionUpCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const editorUri = editor.document.uri.toString();
  const suggestions = editorToSuggestions.get(editorUri);
  const idx = currentSuggestion.get(editorUri);
  if (!suggestions || idx === undefined) return;

  const suggestion = suggestions[idx];
  if (suggestion.newSelected) {
    suggestion.newSelected = false;
  } else if (idx > 0) {
    currentSuggestion.set(editorUri, idx - 1);
  } else return;
  rerenderDecorations(editorUri);
}

type SuggestionSelectionOption = "old" | "new" | "selected";
function selectSuggestion(
  accept: SuggestionSelectionOption,
  key: SuggestionRanges | null = null
) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const editorUri = editor.document.uri.toString();
  const suggestions = editorToSuggestions.get(editorUri);

  if (!suggestions) return;

  let idx: number | undefined;
  if (key) {
    // Use the key to find a specific suggestion
    for (let i = 0; i < suggestions.length; i++) {
      if (
        suggestions[i].newRange === key.newRange &&
        suggestions[i].oldRange === key.oldRange
      ) {
        // Don't include newSelected in the comparison, because it can change
        idx = i;
        break;
      }
    }
  } else {
    // Otherwise, use the current suggestion
    idx = currentSuggestion.get(editorUri);
  }
  if (idx === undefined) return;

  let [suggestion] = suggestions.splice(idx, 1);

  var rangeToDelete: vscode.Range;
  switch (accept) {
    case "old":
      rangeToDelete = suggestion.newRange;
      break;
    case "new":
      rangeToDelete = suggestion.oldRange;
      break;
    case "selected":
      rangeToDelete = suggestion.newSelected
        ? suggestion.oldRange
        : suggestion.newRange;
  }

  let workspaceDir = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0]?.uri.fsPath
    : undefined;

  let collectOn = vscode.workspace
    .getConfiguration("continue")
    .get<boolean>("dataSwitch");

  if (workspaceDir && collectOn) {
    let continueDir = path.join(workspaceDir, ".continue");

    // Check if .continue directory doesn't exists
    if (!fs.existsSync(continueDir)) {
      fs.mkdirSync(continueDir);
    }

    let suggestionsPath = path.join(continueDir, "suggestions.json");

    // Initialize suggestions list
    let suggestions = [];

    // Check if suggestions.json exists
    if (fs.existsSync(suggestionsPath)) {
      let rawData = fs.readFileSync(suggestionsPath, "utf-8");
      suggestions = JSON.parse(rawData);
    }

    if (accept === "new" || (accept === "selected" && suggestion.newSelected)) {
      suggestions.push({
        accepted: true,
        timestamp: Date.now(),
        suggestion: suggestion.newContent,
      });
    } else {
      suggestions.push({
        accepted: false,
        timestamp: Date.now(),
        suggestion: suggestion.newContent,
      });
    }

    // Write the updated suggestions back to the file
    fs.writeFileSync(
      suggestionsPath,
      JSON.stringify(suggestions, null, 4),
      "utf-8"
    );

    // If it's not already there, add .continue to .gitignore
    const gitignorePath = path.join(workspaceDir, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const gitignoreData = fs.readFileSync(gitignorePath, "utf-8");
      const gitIgnoreLines = gitignoreData.split("\n");
      if (!gitIgnoreLines.includes(".continue")) {
        fs.appendFileSync(gitignorePath, "\n.continue\n");
      }
    } else {
      fs.writeFileSync(gitignorePath, ".continue\n");
    }
  }

  rangeToDelete = new vscode.Range(
    rangeToDelete.start,
    new vscode.Position(rangeToDelete.end.line, 0)
  );
  editor.edit((edit) => {
    edit.delete(rangeToDelete);
  });

  // Shift the below suggestions up
  let linesToShift = rangeToDelete.end.line - rangeToDelete.start.line;
  for (let below of suggestions) {
    // Assumes there should be no crossover between suggestions. Might want to enforce this.
    if (
      below.oldRange.union(below.newRange).start.line >
      suggestion.oldRange.union(suggestion.newRange).start.line
    ) {
      below.oldRange = translate(below.oldRange, -linesToShift);
      below.newRange = translate(below.newRange, -linesToShift);
    }
  }

  if (suggestions.length === 0) {
    currentSuggestion.delete(editorUri);
  } else {
    currentSuggestion.set(editorUri, Math.min(idx, suggestions.length - 1));
  }
  rerenderDecorations(editorUri);

  editorToSuggestions.set(editorUri, suggestions);
}

export function acceptSuggestionCommand(key: SuggestionRanges | null = null) {
  sendTelemetryEvent(TelemetryEvent.SuggestionAccepted);
  selectSuggestion("selected", key);
}

function handleAllSuggestions(accept: boolean) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const editorUri = editor.document.uri.toString();
  const suggestions = editorToSuggestions.get(editorUri);
  if (!suggestions) return;

  while (suggestions.length > 0) {
    selectSuggestion(accept ? "new" : "old", suggestions[0]);
  }
}

export function acceptAllSuggestionsCommand() {
  handleAllSuggestions(true);
}

export function rejectAllSuggestionsCommand() {
  handleAllSuggestions(false);
}

export async function rejectSuggestionCommand(
  key: SuggestionRanges | null = null
) {
  sendTelemetryEvent(TelemetryEvent.SuggestionRejected);
  selectSuggestion("old", key);
}

export async function showSuggestion(
  editorFilename: string,
  range: vscode.Range,
  suggestion: string
): Promise<boolean> {
  // const existingCode = await readFileAtRange(
  //   new vscode.Range(range.start, range.end),
  //   editorFilename
  // );

  // If any of the outside lines are the same, don't repeat them in the suggestion
  // const slines = suggestion.split("\n");
  // const elines = existingCode.split("\n");
  // let linesRemovedBefore = 0;
  // let linesRemovedAfter = 0;
  // while (slines.length > 0 && elines.length > 0 && slines[0] === elines[0]) {
  //   slines.shift();
  //   elines.shift();
  //   linesRemovedBefore++;
  // }

  // while (
  //   slines.length > 0 &&
  //   elines.length > 0 &&
  //   slines[slines.length - 1] === elines[elines.length - 1]
  // ) {
  //   slines.pop();
  //   elines.pop();
  //   linesRemovedAfter++;
  // }

  // suggestion = slines.join("\n");
  // if (suggestion === "") return Promise.resolve(false); // Don't even make a suggestion if they are exactly the same

  // range = new vscode.Range(
  //   new vscode.Position(range.start.line + linesRemovedBefore, 0),
  //   new vscode.Position(
  //     range.end.line - linesRemovedAfter,
  //     elines.at(-1)?.length || 0
  //   )
  // );

  const editor = await openEditorAndRevealRange(editorFilename, range);
  if (!editor) return Promise.resolve(false);

  return new Promise((resolve, reject) => {
    editor!
      .edit(
        (edit) => {
          edit.insert(
            new vscode.Position(range.end.line, 0),
            suggestion + (suggestion === "" ? "" : "\n")
          );
        },
        { undoStopBefore: false, undoStopAfter: false }
      )
      .then(
        (success) => {
          if (success) {
            const suggestionLinesLength =
              suggestion === "" ? 0 : suggestion.split("\n").length;
            let suggestionRange = new vscode.Range(
              new vscode.Position(range.end.line, 0),
              new vscode.Position(range.end.line + suggestionLinesLength, 0)
            );
            let content = editor!.document.getText(suggestionRange);

            const filename = editor!.document.uri.toString();
            if (editorToSuggestions.has(filename)) {
              let suggestions = editorToSuggestions.get(filename)!;
              suggestions.push({
                oldRange: range,
                newRange: suggestionRange,
                newSelected: true,
                newContent: content,
              });
              editorToSuggestions.set(filename, suggestions);
              currentSuggestion.set(filename, suggestions.length - 1);
            } else {
              editorToSuggestions.set(filename, [
                {
                  oldRange: range,
                  newRange: suggestionRange,
                  newSelected: true,
                  newContent: content,
                },
              ]);
              currentSuggestion.set(filename, 0);
            }

            rerenderDecorations(filename);
          }
          resolve(success);
        },
        (reason) => reject(reason)
      );
  });
}
