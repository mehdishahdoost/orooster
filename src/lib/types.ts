export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ModelInfo {
  name: string;
  size: number;
  modified_at: string;
}

export interface ChatTokenEvent {
  content: string;
  done: boolean;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
}
