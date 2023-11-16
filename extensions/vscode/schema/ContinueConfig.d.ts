/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type ContinueConfig = ContinueConfig1;
export type Name = string;
export type Hide = boolean;
export type Description = string;
export type ClassName = string;
export type SystemMessage = string;
export type Role = "assistant" | "user" | "system" | "function";
export type Content = string;
export type Name1 = string;
export type Summary = string;
export type Name2 = string;
export type Arguments = string;
export type ChatContext = ChatMessage[];
export type ManageOwnChatContext = boolean;
/**
 * Steps that will be automatically run at the beginning of a new session
 */
export type StepsOnStartup = Step[];
/**
 * Steps that are not allowed to be run, and will be skipped if attempted
 */
export type DisallowedSteps = string[];
/**
 * If this field is set to True, we will collect anonymous telemetry as described in the documentation page on telemetry. If set to False, we will not collect any data.
 */
export type AllowAnonymousTelemetry = boolean;
/**
 * Configuration for the models used by Continue. Read more about how to configure models in the documentation.
 */
export type Models = Models1;
/**
 * A title that will identify this model in the model selection dropdown
 */
export type Title = string;
/**
 * The unique ID of the user.
 */
export type UniqueId = string;
/**
 * The name of the model to be used (e.g. gpt-4, codellama)
 */
export type Model = string;
/**
 * A system message that will always be followed by the LLM
 */
export type SystemMessage1 = string;
/**
 * The maximum context length of the LLM in tokens, as counted by count_tokens.
 */
export type ContextLength = number;
/**
 * Options for the completion endpoint. Read more about the completion options in the documentation.
 */
export type CompletionOptions = BaseCompletionOptions;
/**
 * The temperature of the completion.
 */
export type Temperature = number;
/**
 * The top_p of the completion.
 */
export type TopP = number;
/**
 * The top_k of the completion.
 */
export type TopK = number;
/**
 * The presence penalty Aof the completion.
 */
export type PresencePenalty = number;
/**
 * The frequency penalty of the completion.
 */
export type FrequencyPenalty = number;
/**
 * The stop tokens of the completion.
 */
export type Stop = string[];
/**
 * The maximum number of tokens to generate.
 */
export type MaxTokens = number;
/**
 * Options for the HTTP request to the LLM.
 */
export type RequestOptions = RequestOptions1;
/**
 * Set the timeout for each request to the LLM. If you are running a local LLM that takes a while to respond, you might want to set this to avoid timeouts.
 */
export type Timeout = number;
/**
 * Whether to verify SSL certificates for requests.
 */
export type VerifySsl = boolean;
/**
 * Path to a custom CA bundle to use when making the HTTP request
 */
export type CaBundlePath = string;
/**
 * Proxy URL to use when making the HTTP request
 */
export type Proxy = string;
/**
 * The API key for the LLM provider.
 */
export type ApiKey = string;
/**
 * The base URL of the LLM API.
 */
export type ApiBase = string;
export type Saved = LLM[];
export type Temperature1 = number;
export type SystemMessage2 = string;
/**
 * A system message that will always be followed by the LLM
 */
export type SystemMessage3 = string;
/**
 * Options for the completion endpoint. Read more about the completion options in the documentation.
 */
export type CompletionOptions1 = BaseCompletionOptions;
export type Name3 = string;
export type Prompt = string;
export type Description1 = string;
/**
 * An array of custom commands that allow you to reuse prompts. Each has name, description, and prompt properties. When you enter /<name> in the text input, it will act as a shortcut to the prompt.
 */
export type CustomCommands = CustomCommand[];
export type Name4 = string;
export type Description2 = string;
export type Step1 =
  | unknown
  | (
      | "AnswerQuestionChroma"
      | "GenerateShellCommandStep"
      | "EditHighlightedCodeStep"
      | "ShareSessionStep"
      | "CommentCodeStep"
      | "ClearHistoryStep"
      | "StackOverflowStep"
      | "OpenConfigStep"
    );
/**
 * An array of slash commands that let you map custom Steps to a shortcut.
 */
export type SlashCommands = SlashCommand[];
/**
 * The step that will be run when a traceback is detected (when you use the shortcut cmd+shift+R)
 */
export type OnTraceback = Step;
/**
 * A Policy object that can be used to override the default behavior of Continue, for example in order to build custom agents that take multiple steps at a time.
 */
export type PolicyOverride = Policy;
/**
 * The title of the ContextProvider. This is what must be typed in the input to trigger the ContextProvider.
 */
export type Title1 = string;
/**
 * The display title of the ContextProvider shown in the dropdown menu
 */
export type DisplayTitle = string;
/**
 * A description of the ContextProvider displayed in the dropdown menu
 */
export type Description3 = string;
/**
 * Indicates whether the ContextProvider is dynamic
 */
export type Dynamic = boolean;
/**
 * Indicates whether the ContextProvider requires a query. For example, the SearchContextProvider requires you to type '@search <STRING_TO_SEARCH>'. This will change the behavior of the UI so that it can indicate the expectation for a query.
 */
export type RequiresQuery = boolean;
export type Name5 = string;
export type Description4 = string;
export type ProviderTitle = string;
export type ItemId = string;
export type Content1 = string;
export type Editing = boolean;
export type Editable = boolean;
/**
 * List of selected items in the ContextProvider
 */
export type SelectedItems = ContextItem[];
/**
 * A list of ContextProvider objects that can be used to provide context to the LLM by typing '@'. Read more about ContextProviders in the documentation.
 */
export type ContextProviders = ContextProvider[];
/**
 * An optional token to identify the user.
 */
export type UserToken = string;
/**
 * The URL of the server where development data is sent. No data is sent unless you have explicitly set the `user_token` property to a valid token that we have shared.
 */
export type DataServerUrl = string;
/**
 * If set to `True`, Continue will not generate summaries for each Step. This can be useful if you want to save on compute.
 */
export type DisableSummaries = boolean;
/**
 * If set to `True`, Continue will not index the codebase. This is mainly used for debugging purposes.
 */
export type DisableIndexing = boolean;
/**
 * Settings for the retrieval system. Read more about the retrieval system in the documentation.
 */
export type RetrievalSettings = RetrievalSettings1;
/**
 * Number of results to initially retrieve from vector database
 */
export type NRetrieve = number;
/**
 * Final number of results to use after re-ranking
 */
export type NFinal = number;
/**
 * Whether to use re-ranking, which will allow initial selection of n_retrieve results, then will use an LLM to select the top n_final results
 */
export type UseReranking = boolean;
/**
 * Number of results to group together when re-ranking. Each group will be processed in parallel.
 */
export type RerankGroupSize = number;
/**
 * Files to ignore when indexing the codebase. You can use glob patterns, such as ** /*.py. This is useful for directories that contain generated code, or other directories that are not relevant to the codebase.
 */
export type IgnoreFiles = string[];
/**
 * OpenAI API key
 */
export type OpenaiApiKey = string;
/**
 * OpenAI API base URL
 */
export type ApiBase1 = string;
/**
 * OpenAI API type
 */
export type ApiType = string;
/**
 * OpenAI API version
 */
export type ApiVersion = string;
/**
 * OpenAI organization ID
 */
export type OrganizationId = string;

/**
 * Continue can be deeply customized by editing the `ContinueConfig` object in `~/.continue/config.py` (`%userprofile%\.continue\config.py` for Windows) on your machine. This class is instantiated from the config file for every new session.
 */
export interface ContinueConfig1 {
  steps_on_startup?: StepsOnStartup;
  disallowed_steps?: DisallowedSteps;
  allow_anonymous_telemetry?: AllowAnonymousTelemetry;
  models?: Models;
  system_message?: SystemMessage3;
  completion_options?: CompletionOptions1;
  custom_commands?: CustomCommands;
  slash_commands?: SlashCommands;
  on_traceback?: OnTraceback;
  policy_override?: PolicyOverride;
  context_providers?: ContextProviders;
  user_token?: UserToken;
  data_server_url?: DataServerUrl;
  disable_summaries?: DisableSummaries;
  disable_indexing?: DisableIndexing;
  retrieval_settings?: RetrievalSettings;
  [k: string]: unknown;
}
export interface Step {
  name?: Name;
  hide?: Hide;
  description?: Description;
  class_name?: ClassName;
  system_message?: SystemMessage;
  chat_context?: ChatContext;
  manage_own_chat_context?: ManageOwnChatContext;
  [k: string]: unknown;
}
export interface ChatMessage {
  role: Role;
  content?: Content;
  name?: Name1;
  summary: Summary;
  function_call?: FunctionCall;
  [k: string]: unknown;
}
export interface FunctionCall {
  name: Name2;
  arguments: Arguments;
  [k: string]: unknown;
}
/**
 * Main class that holds the current model configuration
 */
export interface Models1 {
  default: LLM;
  summarize?: LLM;
  edit?: LLM;
  chat?: LLM;
  saved?: Saved;
  temperature?: Temperature1;
  system_message?: SystemMessage2;
  [k: string]: unknown;
}
export interface LLM {
  title?: Title;
  unique_id?: UniqueId;
  model: Model;
  system_message?: SystemMessage1;
  context_length?: ContextLength;
  completion_options?: CompletionOptions;
  request_options?: RequestOptions;
  prompt_templates?: PromptTemplates;
  api_key?: ApiKey;
  api_base?: ApiBase;
  [k: string]: unknown;
}
export interface BaseCompletionOptions {
  temperature?: Temperature;
  top_p?: TopP;
  top_k?: TopK;
  presence_penalty?: PresencePenalty;
  frequency_penalty?: FrequencyPenalty;
  stop?: Stop;
  max_tokens?: MaxTokens;
  [k: string]: unknown;
}
export interface RequestOptions1 {
  timeout?: Timeout;
  verify_ssl?: VerifySsl;
  ca_bundle_path?: CaBundlePath;
  proxy?: Proxy;
  headers?: Headers;
  [k: string]: unknown;
}
/**
 * Headers to use when making the HTTP request
 */
export interface Headers {
  [k: string]: string;
}
/**
 * A dictionary of prompt templates that can be used to customize the behavior of the LLM in certain situations. For example, set the "edit" key in order to change the prompt that is used for the /edit slash command. Each value in the dictionary is a string templated in mustache syntax, and filled in at runtime with the variables specific to the situation. See the documentation for more information.
 */
export interface PromptTemplates {
  [k: string]: unknown;
}
export interface CustomCommand {
  name: Name3;
  prompt: Prompt;
  description: Description1;
  [k: string]: unknown;
}
export interface SlashCommand {
  name: Name4;
  description: Description2;
  step: Step1;
  params?: Params;
  [k: string]: unknown;
}
export interface Params {
  [k: string]: unknown;
}
/**
 * A rule that determines which step to take next
 */
export interface Policy {
  [k: string]: unknown;
}
/**
 * The ContextProvider class is a plugin that lets you provide new information to the LLM by typing '@'.
 * When you type '@', the context provider will be asked to populate a list of options.
 * These options will be updated on each keystroke.
 * When you hit enter on an option, the context provider will add that item to the autopilot's list of context (which is all stored in the ContextManager object).
 */
export interface ContextProvider {
  title: Title1;
  ide?: Ide;
  display_title: DisplayTitle;
  description: Description3;
  dynamic: Dynamic;
  requires_query?: RequiresQuery;
  selected_items?: SelectedItems;
  [k: string]: unknown;
}
export interface Ide {
  [k: string]: unknown;
}
/**
 * A ContextItem is a single item that is stored in the ContextManager.
 */
export interface ContextItem {
  description: ContextItemDescription;
  content: Content1;
  editing?: Editing;
  editable?: Editable;
  [k: string]: unknown;
}
/**
 * A ContextItemDescription is a description of a ContextItem that is displayed to the user when they type '@'.
 *
 * The id can be used to retrieve the ContextItem from the ContextManager.
 */
export interface ContextItemDescription {
  name: Name5;
  description: Description4;
  id: ContextItemId;
  [k: string]: unknown;
}
/**
 * A ContextItemId is a unique identifier for a ContextItem.
 */
export interface ContextItemId {
  provider_title: ProviderTitle;
  item_id: ItemId;
  [k: string]: unknown;
}
export interface RetrievalSettings1 {
  n_retrieve?: NRetrieve;
  n_final?: NFinal;
  use_reranking?: UseReranking;
  rerank_group_size?: RerankGroupSize;
  ignore_files?: IgnoreFiles;
  openai_api_key?: OpenaiApiKey;
  api_base?: ApiBase1;
  api_type?: ApiType;
  api_version?: ApiVersion;
  organization_id?: OrganizationId;
  [k: string]: unknown;
}
