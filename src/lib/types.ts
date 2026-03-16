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

export interface AppSettings {
  ollama_url: string;
  context_size: number;
}

export interface PullProgressEvent {
  status: string;
  total: number;
  completed: number;
  done: boolean;
}

export interface LibraryModel {
  name: string;
  description: string;
  pulls: string;
  tag_count: string;
  url: string;
}

export type TabId = "chat" | "models" | "settings";
export type ModelsSubTab = "available" | "installed";
