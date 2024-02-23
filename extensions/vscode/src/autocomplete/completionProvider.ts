import AutocompleteLruCache from "core/autocomplete/cache";
import { DEFAULT_AUTOCOMPLETE_OPTS } from "core/autocomplete/parameters";
import { v4 as uuidv4 } from "uuid";
import * as vscode from "vscode";
import { ideProtocolClient } from "../activation/activate";
import { configHandler } from "../loadConfig";
import { getTabCompletion } from "./getTabCompletion";
import { stopStatusBarLoading } from "./statusBar";

export class ContinueCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private static debounceTimeout: NodeJS.Timeout | undefined = undefined;
  private static debouncing: boolean = false;
  private static lastUUID: string | undefined = undefined;

  private static autocompleteCache = AutocompleteLruCache.get();

  public static errorsShown: Set<string> = new Set();

  public async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
    //@ts-ignore
  ): ProviderResult<InlineCompletionItem[] | InlineCompletionList> {
    // Debounce
    const uuid = uuidv4();
    ContinueCompletionProvider.lastUUID = uuid;

    const config = await configHandler.loadConfig();
    const options = {
      ...config.tabAutocompleteOptions,
      ...DEFAULT_AUTOCOMPLETE_OPTS,
    };

    if (ContinueCompletionProvider.debouncing) {
      ContinueCompletionProvider.debounceTimeout?.refresh();
      const lastUUID = await new Promise((resolve) =>
        setTimeout(() => {
          resolve(ContinueCompletionProvider.lastUUID);
        }, options.debounceDelay)
      );
      if (uuid !== lastUUID) {
        return [];
      }
    } else {
      ContinueCompletionProvider.debouncing = true;
      ContinueCompletionProvider.debounceTimeout = setTimeout(async () => {
        ContinueCompletionProvider.debouncing = false;
      }, options.debounceDelay);
    }

    const enableTabAutocomplete =
      vscode.workspace
        .getConfiguration("continue")
        .get<boolean>("enableTabAutocomplete") || false;
    if (token.isCancellationRequested || !enableTabAutocomplete) {
      return [];
    }

    try {
      const outcome = await getTabCompletion(
        document,
        position,
        token,
        options
      );
      const completion = outcome?.completion;

      if (!completion) {
        return [];
      }

      // Do some stuff later so as not to block return. Latency matters
      setTimeout(async () => {
        if (!outcome.cacheHit) {
          (await ContinueCompletionProvider.autocompleteCache).put(
            outcome.prompt,
            completion
          );
        }
      }, 100);

      const logRejectionTimeout = setTimeout(() => {
        // Wait 10 seconds, then assume it wasn't accepted
        outcome.accepted = false;
        ideProtocolClient.logDevData("autocomplete", outcome);
      }, 10_000);

      return [
        new vscode.InlineCompletionItem(
          completion,
          new vscode.Range(position, position.translate(0, completion.length)),
          {
            title: "Log Autocomplete Outcome",
            command: "continue.logAutocompleteOutcome",
            arguments: [outcome, logRejectionTimeout],
          }
        ),
      ];
    } catch (e: any) {
      console.warn("Error getting autocompletion: ", e.message);
    } finally {
      stopStatusBarLoading();
    }
  }
}
