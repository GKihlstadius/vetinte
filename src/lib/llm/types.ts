export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMGenerateParams {
  system: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  responseSchema?: object;
  tools?: LLMTool[];
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: object;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface LLMResult {
  text: string;
  parsed?: unknown;
  toolCalls?: { name: string; args: unknown }[];
  usage: LLMUsage;
  provider?: string;
}

export interface LLMProvider {
  name: string;
  generate(params: LLMGenerateParams): Promise<LLMResult>;
  generateStream(
    params: LLMGenerateParams
  ): AsyncIterable<{ type: 'token' | 'tool_call' | 'done'; data: unknown }>;
}
