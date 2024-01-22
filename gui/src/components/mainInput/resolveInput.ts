import { JSONContent } from "@tiptap/react";
import {
  ContextItemWithId,
  EmbeddingsProvider,
  IContextProvider,
  ILLM,
  MessageContent,
  MessagePart,
} from "core";
import { ExtensionIde } from "core/ide";
import { ideRequest } from "core/ide/messaging";
import { stripImages } from "core/llm/countTokens";
import { getBasename } from "core/util";

interface MentionAttrs {
  label: string;
  id: string;
  itemType?: string;
  query?: string;
}

/**
 * This function converts the input from the editor to a string, resolving any context items
 * Context items are appended to the top of the prompt and then referenced within the input
 * @param editor
 * @returns string representation of the input
 */

async function resolveEditorContent(
  editorState: JSONContent,
  contextProviders: IContextProvider[],
  llm: ILLM,
  embeddingsProvider?: EmbeddingsProvider
): Promise<[ContextItemWithId[], MessageContent]> {
  let parts: MessagePart[] = [];
  let contextItemAttrs: MentionAttrs[] = [];
  let slashCommand = undefined;
  for (const p of editorState?.content) {
    if (p.type === "paragraph") {
      const [text, ctxItems, foundSlashCommand] = resolveParagraph(p);
      if (foundSlashCommand && typeof slashCommand === "undefined") {
        slashCommand = foundSlashCommand;
      }
      if (text === "") {
        continue;
      }

      if (parts[parts.length - 1]?.type === "text") {
        parts[parts.length - 1].text += "\n" + text;
      } else {
        parts.push({ type: "text", text });
      }
      contextItemAttrs.push(...ctxItems);
    } else if (p.type === "codeBlock") {
      if (!p.attrs.item.editing) {
        const text =
          "```" + p.attrs.item.name + "\n" + p.attrs.item.content + "\n```";
        if (parts[parts.length - 1]?.type === "text") {
          parts[parts.length - 1].text += "\n" + text;
        } else {
          parts.push({
            type: "text",
            text,
          });
        }
      }
    } else if (p.type === "image") {
      parts.push({
        type: "imageUrl",
        imageUrl: {
          url: p.attrs.src,
        },
      });
    } else {
      console.warn("Unexpected content type", p.type);
    }
  }

  let contextItemsText = "";
  let contextItems: ContextItemWithId[] = [];
  const ide = new ExtensionIde();
  for (const item of contextItemAttrs) {
    if (item.itemType === "file") {
      // This is a quick way to resolve @file references
      const basename = getBasename(item.id);
      const content = await ide.readFile(item.id);
      contextItemsText += `\`\`\`title="${basename}"\n${content}\n\`\`\`\n`;
      contextItems.push({
        name: basename,
        description: item.id,
        content,
        id: {
          providerTitle: "file",
          itemId: item.id,
        },
      });
    } else {
      const data = {
        name: item.itemType === "contextProvider" ? item.id : item.itemType,
        query: item.query,
        fullInput: stripImages(parts),
      };
      const { items: resolvedItems } = await ideRequest(
        "getContextItems",
        data
      );
      contextItems.push(...resolvedItems);
      for (const resolvedItem of resolvedItems) {
        contextItemsText += resolvedItem.content + "\n\n";
      }
    }
  }

  if (contextItemsText !== "") {
    contextItemsText += "\n";
  }

  if (slashCommand) {
    let firstTextIndex = parts.findIndex((part) => part.type === "text");
    parts[
      firstTextIndex
    ].text = `${slashCommand} ${parts[firstTextIndex].text}`;
  }

  return [contextItems, parts];
}

function resolveParagraph(p: JSONContent): [string, MentionAttrs[], string] {
  let text = "";
  const contextItems = [];
  let slashCommand = undefined;
  for (const child of p.content || []) {
    if (child.type === "text") {
      text += child.text;
    } else if (child.type === "mention") {
      if (!["codebase"].includes(child.attrs.id)) {
        text += child.attrs.label;
      }
      contextItems.push(child.attrs);
    } else if (child.type === "slashcommand") {
      if (typeof slashCommand === "undefined") {
        slashCommand = child.attrs.id;
      } else {
        text += child.attrs.label;
      }
    } else {
      console.warn("Unexpected child type", child.type);
    }
  }
  return [text, contextItems, slashCommand];
}

export default resolveEditorContent;
