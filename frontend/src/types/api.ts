export interface ApiError {
  error: string;
}

export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  context?: {
    currentPlaceholderKey?: string;
    lastQuestion?: string;
    unfilledPlaceholders?: Array<{
      key: string;
      label: string;
      originalPattern: string;
      [key: string]: any;
    }>;
  };
}

export interface ChatResponse {
  mode?: 'fill' | 'chat';
  understood?: boolean;
  field?: string | null;
  value?: string | null;
  suggestion?: string | null;
  reason?: string | null;
  ack?: string;
  needsClarification?: boolean;
  response?: string | null; // For chat mode
  message?: string; // Fallback for older responses
}

export interface StreamChunk {
  content?: string;
  done?: boolean;
  error?: string;
  parsedResponse?: ChatResponse; // Parsed JSON response when done (for mode detection)
}

