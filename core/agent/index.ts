import { ILLM } from "..";
import { streamLines } from "../diff/util";
import { ITool, runTool } from "./tools";

export interface IAgent {
  readonly llm: ILLM;
  readonly tools: ITool[];
}

/// Run agent with context.
/// Context is usually a task description,
/// the agent will choose a tool to complete the task.
export async function* runAgent(agent: IAgent, context: string) {
  // Generate prompt from context and tools
  let prompt = context;
  for (const tool of agent.tools) {
    prompt += `\n\nIf you want to **${tool.intent}**, please format your reply as:\n\n${tool.format}`;
  }
  prompt += "\n\nWhat's your next action?";

  // Agent loop
  let retriesLeft = 1;
  while (true) {
    // Handle retry
    if (retriesLeft <= 0) {
      yield "💀 Too many retries, exiting!\n\n";
      break;
    } else {
      yield `💧 Retries left: ${retriesLeft}\n\n`;
      retriesLeft--;
    }

    // Reset tools
    for (const tool of agent.tools) {
      tool.reset();
    }

    // Start agent with prompt
    yield "😅 Starting agent loop...\n\n";
    const completion = agent.llm.streamChat(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        temperature: 0.5,
      },
    );
    const lineStream = streamLines(completion);

    // Use tools
    let selectedTool: ITool | undefined;
    let error = false;
    for await (const line of lineStream) {
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
          const result = runTool(selectedTool, line, false);

          // Handle error by retrying from scratch
          if (result.status === "error") {
            yield `💀 Tool error: ${result.message}, retrying!\n\n`;
            error = true;
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

        // If error is generated in inner loop, retry
        if (error) {
          break;
        }
      }
    }

    // If error is generated in inner loop, retry
    if (error) {
      continue;
    }

    // If no tool selected, retry
    if (!selectedTool) {
      yield "💀 No tool selected, retrying!\n\n";
      continue;
    }

    // If tool is selected, check if all steps are done
    // If not, report error and retry
    const result = runTool(selectedTool, "", true);
    if (result.status === "error") {
      yield `💀 Tool error: ${result.message}, retrying!\n\n`;
      continue;
    }

    // Session finished
    yield "😱 Session finished!\n\n";
    break;
  }
}
