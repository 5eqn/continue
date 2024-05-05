import { ChatMessage, ILLM } from "..";
import { streamLines } from "../diff/util";
import { ITool, runTool } from "./tools";

export type ToolBuilder = () => ITool;

export interface IAgent {
  readonly llm: ILLM;
  readonly tools: ToolBuilder[];
}

/// Run agent with context.
/// Context is usually a task description,
/// the agent will choose a tool to complete the task.
export async function* runAgent(agent: IAgent, context: string) {
  // Generate prompt from context and tools
  let prompt = context;
  const tools = agent.tools.map((builder) => builder());
  for (const tool of tools) {
    prompt += `\n\nIf you want to **${tool.intent}**, please format your reply as:\n\n${tool.format}`;
  }
  prompt += "\n\nWhat's your next action?";
  let message: ChatMessage[] = [
    {
      role: "user",
      content: prompt,
    },
  ];

  // Agent loop
  let retriesLeft = 3;
  while (true) {
    // Handle retry
    if (retriesLeft <= 0) {
      yield "💀 Too many retries, exiting!\n\n";
      break;
    } else {
      yield `💧 Retries left: ${retriesLeft}\n\n`;
      retriesLeft--;
    }

    // Start agent with prompt
    // The longest conversation is: "context" + "action" + "realCode" + "givenCode" + "action"
    // So we set input maxTokens to 80% of context length
    yield "😅 Starting agent loop...\n\n";
    const completion = agent.llm.streamChat(message, {
      temperature: 0.5,
    });
    const lineStream = streamLines(completion);

    // Build tools for this loop
    const tools = agent.tools.map((builder) => builder());

    // Some state to keep track of when reading reply
    let selectedTool: ITool | undefined;
    let error = "";
    let reply = "";

    // Use tools according to reply
    for await (const line of lineStream) {
      // Record reply
      reply += line + "\n";

      // Skip if in error
      if (error) {
        continue;
      }

      // Try to select tool if not selected
      if (!selectedTool) {
        for (const tool of tools) {
          if (tool.prefix && line.startsWith(tool.prefix)) {
            selectedTool = tool;
            yield `🔧 Agent selected tool "${tool.name}"!\n\n`;
            break;
          }
        }
      }

      // Use tool if selected
      if (selectedTool) {
        while (true) {
          const result = runTool(selectedTool, line, false);

          // Handle error by retrying
          if (result.status === "error") {
            yield `💀 Tool error: ${result.message} retrying!\n\n`;
            error = result.message;
            break;
          }

          // Break if complete
          if (result.status === "complete") {
            break;
          }

          // Match next if break
          if (result.status === "break") {
            if (result.message) {
              yield `⚙️ Tool message: ${result.message}\n\n`;
            }
            continue;
          }

          // Otherwise stop looping, because tool step did not increase
          break;
        }
      }
    }

    // If error is generated in inner loop, read all output
    // and retry with one layer of history
    if (error) {
      if (message.length > 1) {
        message = message.slice(0, 1);
      }
      message.push({
        role: "assistant",
        content: reply,
      });
      message.push({
        role: "user",
        content: `Your reply has wrong format: ${error} Please retry!`,
      });
      continue;
    }

    // If no tool selected, retry
    if (!selectedTool) {
      yield "💀 No tool selected, retrying!\n\n";
      continue;
    }

    // If tool is selected, check if all steps are done
    // If not, report error and retry with one layer of history
    const result = runTool(selectedTool, "", true);
    if (result.status === "error") {
      yield `💀 Tool error: ${result.message}, retrying!\n\n`;
      if (message.length > 1) {
        message = message.slice(0, 1);
      }
      message.push({
        role: "assistant",
        content: reply,
      });
      message.push({
        role: "user",
        content: `Your reply has wrong format: ${result.message}! Please retry!`,
      });
      continue;
    }

    // Session finished
    yield "😱 Session finished!\n\n";
    break;
  }
}
