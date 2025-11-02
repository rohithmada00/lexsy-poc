export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatContext {
  documentText?: string;
  fields?: Array<{
    name: string;
    placeholder: string;
    suggestion: string;
    type: string;
  }>;
}

