import { ChatMessage, ILLM } from "..";

interface PromptComponent {
  /// Message of this prompt component
  message: ChatMessage;

  /// Whether this component is necessary
  /// A necessary component can't be deleted because lack of content length
  /// buildPrompt will return `undefined` instead
  necessary: boolean;

  /// Priority of this component
  /// Lowest priority will be pruned first
  priority: number;
}

/// Builder of a prompt, which can prune messages to fit token limit
/// Helpful when prompt is large, and some messages are less important
export default class PromptBuilder {
  readonly llm: ILLM;
  readonly maxTokens: number;

  currentTokens: number = 0;
  components: PromptComponent[] = [];

  constructor(llm: ILLM, maxTokens: number) {
    this.llm = llm;
    this.maxTokens = maxTokens;
  }

  addComponent(message: ChatMessage, priority?: number) {
    // Add component to the list
    this.components.push({
      message,
      necessary: priority === undefined,
      priority: priority ?? 0,
    });

    // Update token count
    this.currentTokens += this.llm.countTokens(message.content.toString());
  }

  addUserMessage(message: string, priority?: number) {
    this.addComponent({ role: "user", content: message }, priority);
  }

  addAssistantMessage(message: string, priority?: number) {
    this.addComponent({ role: "assistant", content: message }, priority);
  }

  buildPrompt(): ChatMessage[] | undefined {
    while (true) {
      // If token count is less than max tokens, return the prompt by merging same role messages
      if (this.currentTokens <= this.maxTokens) {
        const prompt: ChatMessage[] = [];
        let lastRole: string | undefined;
        for (const component of this.components) {
          if (lastRole === component.message.role) {
            prompt[prompt.length - 1].content +=
              "\n" + component.message.content;
          } else {
            prompt.push({ ...component.message });
          }
          lastRole = component.message.role;
        }
        return prompt;
      }

      // If all components are necessary, return undefined
      const priorities = this.components
        .filter((c) => !c.necessary)
        .map((c) => c.priority);
      if (priorities.length === 0) {
        return undefined;
      }

      // Otherwise, remove the lowest priority component
      const lowestPriority = Math.min(...priorities);
      while (true) {
        const lowestIndex = this.components.findIndex(
          (component) => component.priority === lowestPriority,
        );

        // Stop if all removed
        if (lowestIndex == -1) {
          break;
        }

        // Remove token count accordingly
        const lowestComponent = this.components[lowestIndex];
        this.currentTokens -= this.llm.countTokens(
          lowestComponent.message.content.toString(),
        );

        // Remove the lowest priority component
        this.components.splice(lowestIndex, 1);
      }
    }
  }
}
