export interface ApiError {
  error: string;
}

export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  context?: string;
}

export interface ChatResponse {
  message: string;
}

export interface StreamChunk {
  content?: string;
  done?: boolean;
  error?: string;
}

