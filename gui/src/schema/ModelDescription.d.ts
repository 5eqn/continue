/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type ModelDescription = ModelDescription1;
/**
 * The title you wish to give your model.
 */
export type Title = string;
/**
 * The provider of the model. This is used to determine the type of model, and how to interact with it.
 */
export type Provider =
  | "openai"
  | "openai-free-trial"
  | "openai-aiohttp"
  | "anthropic"
  | "together"
  | "ollama"
  | "huggingface-tgi"
  | "huggingface-inference-api"
  | "llama.cpp"
  | "replicate"
  | "text-gen-webui"
  | "google-palm"
  | "lmstudio";
/**
 * The name of the model. Used to autodetect prompt template.
 */
export type Model = string;
/**
 * OpenAI, Anthropic, Together, or other API key
 */
export type ApiKey = string;
/**
 * The base URL of the LLM API.
 */
export type ApiBase = string;
/**
 * The maximum context length of the LLM in tokens, as counted by count_tokens.
 */
export type ContextLength = number;
/**
 * The chat template used to format messages. This is auto-detected for most models, but can be overridden here.
 */
export type Template = "llama2" | "alpaca" | "zephyr" | "phind" | "anthropic" | "chatml";
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
 * A system message that will always be followed by the LLM
 */
export type SystemMessage = string;
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

export interface ModelDescription1 {
  title: Title;
  provider: Provider;
  model: Model;
  api_key?: ApiKey;
  api_base?: ApiBase;
  context_length?: ContextLength;
  template?: Template;
  completion_options?: CompletionOptions;
  system_message?: SystemMessage;
  request_options?: RequestOptions;
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
