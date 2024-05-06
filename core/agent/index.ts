import { ILLM } from "..";
import { streamLines } from "../diff/util";
import PromptBuilder from "../util/promptBuilder";
import { checkToolStatus, ITool, runTool } from "./tools";

export interface IAgent {
  readonly llm: ILLM;
  readonly tools: ITool[];
}

/// Run agent with context.
/// Context is usually a task description,
/// the agent will choose a tool to complete the task.
export async function* runAgent(agent: IAgent, promptBuilder: PromptBuilder) {
  const MAX_RETRY = 9;
  const FEEDBACK_PRIORITY = 1000;

  // Generate prompt from context and tools
  for (const tool of agent.tools) {
    promptBuilder.addUserMessage(
      `\nIf you want to **${tool.intent}**, please format your reply as:\n\n${tool.format} (End of reply)`,
    );
  }
  promptBuilder.addUserMessage(
    "\nWhat's your next action? (Please reply with Ordered List! One action at a time!)",
  );

  // Agent loop
  let retriesLeft = MAX_RETRY;
  while (true) {
    // Process retry
    if (retriesLeft <= 0) {
      yield "💀 Too many retries, exiting!\n\n";
      break;
    } else {
      yield `💧 Retries left: ${retriesLeft}\n\n`;
      retriesLeft--;
    }

    // Reset all tools
    for (const tool of agent.tools) {
      tool.reset();
    }

    // Build message, abort if not enough context length
    let message = promptBuilder.buildPrompt();
    if (!message) {
      yield "💀 Not enough context length to start agent!\n\n";
      return;
    }

    // Start agent with prompt
    yield "😅 Starting agent loop...\n\n";
    yield `🤖 Context length is ${agent.llm.contextLength}\n\n`;
    const completion = agent.llm.streamChat(message, {
      temperature: 0.5,
      maxTokens: agent.llm.contextLength / 2,
    });
    const lineStream = streamLines(completion);

    // Use tools according to reply
    let selectedTool: ITool | undefined;
    let error = "";
    let reply = "";
    for await (const line of lineStream) {
      reply += line + "\n";

      // Skip if in error,
      // reply will still be collected to make it show in output
      if (error) {
        continue;
      }

      // Try to select tool if not selected
      if (!selectedTool) {
        for (const tool of agent.tools) {
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
          const result = await runTool(selectedTool, line);

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

          // Greedily match next if the last step breaks
          if (result.status === "break") {
            if (result.message) {
              yield `⚙️ Tool message: ${result.message}\n\n`;
            }
            continue;
          }

          // Stop looping if last step continues (to match later lines)
          break;
        }
      }
    }

    // If error is generated in inner loop, read all output and retry
    if (error) {
      // Feedback is more important than code, but less important than new feedback
      // Here priority increases by 1 for each retry, so when context length is in short,
      // new feedback will be shown first!
      promptBuilder.addAssistantMessage(
        reply,
        MAX_RETRY - retriesLeft + FEEDBACK_PRIORITY,
      );
      promptBuilder.addUserMessage(
        `Your reply is invalid: ${error} Please retry!`,
        MAX_RETRY - retriesLeft + FEEDBACK_PRIORITY,
      );
      continue;
    }

    // If no tool selected, it means LLM did nothing
    // Retry in this case!
    if (!selectedTool) {
      yield "💀 No tool selected, retrying!\n\n";
      promptBuilder.addAssistantMessage(
        reply,
        MAX_RETRY - retriesLeft + FEEDBACK_PRIORITY,
      );
      promptBuilder.addUserMessage(
        `Your reply did not match any of the above actions! Please retry!`,
        MAX_RETRY - retriesLeft + FEEDBACK_PRIORITY,
      );
      continue;
    }

    // If a tool is selected, check if all steps are done
    // If not, it means the tool stuck in one step
    // Report error and retry in this case!
    const result = checkToolStatus(selectedTool);
    if (result.status === "error") {
      yield `💀 Tool error: ${result.message} retrying!\n\n`;
      promptBuilder.addAssistantMessage(
        reply,
        MAX_RETRY - retriesLeft + FEEDBACK_PRIORITY,
      );
      promptBuilder.addUserMessage(
        `Your reply has wrong format: ${result.message} Please retry!`,
        MAX_RETRY - retriesLeft + FEEDBACK_PRIORITY,
      );
      continue;
    } else if (result.status === "complete") {
      yield `🔥 Tool completed: ${result.message}\n\n`;

      // Finish session if tool is confirm
      if (selectedTool.name === "confirm") {
        yield "😱 Session finished!\n\n";
        break;
      }

      // Otherwise add assistant message and continue
      promptBuilder.addAssistantMessage(
        reply,
        MAX_RETRY - retriesLeft + FEEDBACK_PRIORITY,
      );
      promptBuilder.addUserMessage(
        `${result.message} What's your next action?`,
        MAX_RETRY - retriesLeft + FEEDBACK_PRIORITY,
      );
      continue;
    }
  }
}
