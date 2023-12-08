import { ModelProvider, RequestOptions } from "../config";
import { CONTEXT_LENGTH_FOR_MODEL, DEFAULT_ARGS } from "./constants";
import {
  compileChatMessages,
  countTokens,
  pruneRawPromptFromTop,
} from "./countTokens";
import { CompletionOptions, ChatMessage } from "./types";

async function streamToString(stream: any) {
  let decoder = new TextDecoder("utf-8");
  let result = "";
  for await (const chunk of stream) {
    result += decoder.decode(chunk);
  }
  return result;
}

interface LLMOptions {
  title?: string;
  uniqueId: string;
  model?: string;
  systemMessage?: string;
  contextLength?: number;
  completionOptions?: CompletionOptions;
  requestOptions?: RequestOptions;
  promptTemplates?: Record<string, string>;
  templateMessages?: (messages: ChatMessage[]) => string;
  writeLog?: (str: string) => Promise<void>;
  llmRequestHook?: (model: string, prompt: string) => any;
  apiKey?: string;
  apiBase?: string;
}

interface LLMFullCompletionOptions {
  raw?: boolean;
  log?: boolean;

  model?: string;

  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stop?: string[];
  maxTokens?: number;
}

export abstract class LLM implements LLMOptions {
  static providerName: ModelProvider;

  get providerName(): ModelProvider {
    return (this.constructor as typeof LLM).providerName;
  }

  title?: string;
  uniqueId: string;
  model: string;
  systemMessage?: string;
  contextLength: number;
  completionOptions?: CompletionOptions;
  requestOptions?: RequestOptions;
  promptTemplates?: Record<string, string>;
  templateMessages?: (messages: ChatMessage[]) => string;
  writeLog?: (str: string) => Promise<void>;
  llmRequestHook?: (model: string, prompt: string) => any;
  apiKey?: string;
  apiBase?: string;

  constructor(options: LLMOptions) {
    this.title = options.title;
    this.uniqueId = options.uniqueId;
    this.model = options.model;
    this.systemMessage = options.systemMessage;
    this.contextLength = options.contextLength;
    this.completionOptions = {
      ...options.completionOptions,
      model: options.model || "gpt-4",
    };
    this.requestOptions = options.requestOptions;
    this.promptTemplates = options.promptTemplates;
    this.templateMessages = options.templateMessages;
    this.writeLog = options.writeLog;
    this.llmRequestHook = options.llmRequestHook;
    this.apiKey = options.apiKey;
    this.apiBase = options.apiBase;
  }

  private _compileChatMessages(
    options: CompletionOptions,
    messages: ChatMessage[],
    functions?: any[]
  ) {
    let contextLength = this.contextLength;
    if (
      options.model !== this.model &&
      options.model in CONTEXT_LENGTH_FOR_MODEL
    ) {
      contextLength = CONTEXT_LENGTH_FOR_MODEL[options.model];
    }

    return compileChatMessages(
      options.model,
      messages,
      contextLength,
      options.maxTokens,
      undefined,
      functions,
      this.systemMessage
    );
  }

  private _getSystemMessage(): string | undefined {
    // TODO: Merge with config system message
    return this.systemMessage;
  }

  private _templatePromptLikeMessages(prompt: string): string {
    if (!this.templateMessages) {
      return prompt;
    }

    const msgs: ChatMessage[] = [{ role: "user", content: prompt }];

    const systemMessage = this._getSystemMessage();
    if (systemMessage) {
      msgs.unshift({ role: "system", content: systemMessage });
    }

    return this.templateMessages(msgs);
  }

  private _compileLogMessage(
    prompt: string,
    completionOptions: CompletionOptions
  ): string {
    const dict = { contextLength: this.contextLength, ...completionOptions };
    const settings = Object.entries(dict)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
    return `Settings:
  ${settings}
  
  ############################################
  
  ${prompt}`;
  }

  private _logTokensGenerated(model: string, completion: string) {
    // TODO: PostHog
  }

  private _parseCompletionOptions(options: LLMFullCompletionOptions) {
    const log = options.log ?? true;
    const raw = options.raw ?? false;
    delete options.log;
    delete options.raw;

    const completionOptions: CompletionOptions = {
      ...this.completionOptions,
      ...options,
    };

    return { completionOptions, log, raw };
  }

  private _formatChatMessages(messages: ChatMessage[]): string {
    let formatted = "";
    for (let msg of messages) {
      formatted += `<${msg.role}>\n${msg.content || ""}\n\n`;
    }
    return formatted;
  }

  async *streamComplete(
    prompt: string,
    options: LLMFullCompletionOptions = {}
  ) {
    const { completionOptions, log, raw } =
      this._parseCompletionOptions(options);

    prompt = pruneRawPromptFromTop(
      completionOptions.model,
      this.contextLength,
      prompt,
      completionOptions.maxTokens
    );

    if (!raw) {
      prompt = this._templatePromptLikeMessages(prompt);
    }

    if (log) {
      if (this.writeLog) {
        await this.writeLog(this._compileLogMessage(prompt, completionOptions));
      }
      if (this.llmRequestHook) {
        this.llmRequestHook(completionOptions.model, prompt);
      }
    }

    let completion = "";
    for await (const chunk of this._streamComplete(prompt, completionOptions)) {
      completion += chunk;
      yield chunk;
    }

    this._logTokensGenerated(completionOptions.model, completion);
  }

  async complete(prompt: string, options: LLMFullCompletionOptions = {}) {
    const { completionOptions, log, raw } =
      this._parseCompletionOptions(options);

    prompt = pruneRawPromptFromTop(
      completionOptions.model,
      this.contextLength,
      prompt,
      completionOptions.maxTokens
    );

    if (!raw) {
      prompt = this._templatePromptLikeMessages(prompt);
    }

    if (log) {
      if (this.writeLog) {
        await this.writeLog(this._compileLogMessage(prompt, completionOptions));
      }
      if (this.llmRequestHook) {
        this.llmRequestHook(completionOptions.model, prompt);
      }
    }

    const completion = await this._complete(prompt, completionOptions);

    this._logTokensGenerated(completionOptions.model, completion);
    return completion;
  }

  async *streamChat(
    messages: ChatMessage[],
    options: LLMFullCompletionOptions = {}
  ): AsyncGenerator<ChatMessage> {
    const { completionOptions, log, raw } =
      this._parseCompletionOptions(options);

    messages = this._compileChatMessages(completionOptions, messages);

    const prompt = this.templateMessages
      ? this.templateMessages(messages)
      : this._formatChatMessages(messages);
    if (log) {
      if (this.writeLog) {
        await this.writeLog(this._compileLogMessage(prompt, completionOptions));
      }
      if (this.llmRequestHook) {
        this.llmRequestHook(completionOptions.model, prompt);
      }
    }

    let completion = "";

    try {
      if (this.templateMessages) {
        for await (const chunk of this._streamComplete(
          prompt,
          completionOptions
        )) {
          completion += chunk;
          yield { role: "assistant", content: chunk };
        }
      } else {
        for await (const chunk of this._streamChat(
          messages,
          completionOptions
        )) {
          completion += chunk.content;
          yield chunk;
        }
      }
    } catch (error) {
      console.log(error);
      throw error;
    }

    this._logTokensGenerated(completionOptions.model, completion);
  }

  protected async *_streamComplete(
    prompt: string,
    options: CompletionOptions
  ): AsyncGenerator<string> {
    throw new Error("Not implemented");
  }

  protected async *_streamChat(
    messages: ChatMessage[],
    options: CompletionOptions
  ): AsyncGenerator<ChatMessage> {
    if (!this.templateMessages) {
      throw new Error(
        "You must either implement templateMessages or _streamChat"
      );
    }

    for await (const chunk of this._streamComplete(
      this.templateMessages(messages),
      options
    )) {
      yield { role: "assistant", content: chunk };
    }
  }

  protected async _complete(prompt: string, options: CompletionOptions) {
    let completion = "";
    for await (const chunk of this._streamComplete(prompt, options)) {
      completion += chunk;
    }
    return completion;
  }

  countTokens(text: string): number {
    return countTokens(text, this.model);
  }

  protected collectArgs(options: CompletionOptions): any {
    return {
      ...DEFAULT_ARGS,
      // model: this.model,
      ...options,
    };
  }
}
