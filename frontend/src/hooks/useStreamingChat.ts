import { useState, useCallback, useRef } from 'react';
import { streamChat } from '../services/api';
import type { ChatMessage } from '../types/chat';
import type { ChatRequest, ChatResponse } from '../types/api';

export function useStreamingChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (userMessage: string, context?: ChatRequest['context']): Promise<ChatResponse | null> => {
    setError(null);
    setIsStreaming(true);

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);

    // Create assistant message placeholder
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMsg]);

    let parsedResponse: ChatResponse | null = null;

    try {
      // Prepare messages for API (excluding the empty assistant message)
      const apiMessages = [
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: 'user' as const,
          content: userMessage,
        },
      ];

      // Stream the response - accumulate content and display it in real-time
      let fullContent = '';
      
      for await (const chunk of streamChat(apiMessages, context)) {
        if (chunk.done) {
          // When done, try to parse the accumulated content as JSON
          // But only if it looks like JSON (starts with { or [)
          const cleanedContent = fullContent.trim();
          const looksLikeJson = cleanedContent.startsWith('{') || cleanedContent.startsWith('[');
          
          if (looksLikeJson) {
            try {
              // Clean up the content (remove markdown code blocks if present)
              let jsonContent = cleanedContent.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
              
              parsedResponse = JSON.parse(jsonContent) as ChatResponse;
              
              // Update message content based on mode - only show user-friendly content
              let displayContent = '';
              if (parsedResponse.mode === 'chat' && parsedResponse.response) {
                displayContent = parsedResponse.response;
              } else if (parsedResponse.mode === 'fill') {
                // For fill mode, show acknowledgment and optionally suggestion/reason
                displayContent = parsedResponse.ack || '';
                if (parsedResponse.suggestion && parsedResponse.reason) {
                  if (displayContent) {
                    displayContent += `\n\n${parsedResponse.reason}`;
                  } else {
                    displayContent = parsedResponse.reason;
                  }
                } else if (parsedResponse.reason) {
                  if (displayContent) {
                    displayContent += `\n\n${parsedResponse.reason}`;
                  } else {
                    displayContent = parsedResponse.reason;
                  }
                }
              } else {
                // Fallback - use cleaned content
                displayContent = cleanedContent || 'Response received';
              }
              
              // Only update message with parsed, user-friendly content
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: displayContent || 'Response received' }
                    : msg
                )
              );
            } catch (parseError) {
              // If parsing fails but content looks like JSON, log error but show content
              console.warn('Failed to parse response JSON:', parseError);
              // Show the actual content to the user instead of generic error
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: cleanedContent || 'Response received' }
                    : msg
                )
              );
            }
          } else {
            // Not JSON - just display the content as-is
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMsgId
                  ? { ...msg, content: cleanedContent || 'Response received' }
                  : msg
              )
            );
          }
          break;
        }
        // Accumulate content but don't display raw JSON - keep content empty during streaming
        // The TypingIndicator component will show the animated dots instead
        if (chunk.content) {
          fullContent += chunk.content;
          // Keep message content empty during streaming - TypingIndicator handles the visual feedback
        }
        if (chunk.error) {
          throw new Error(chunk.error);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      
      // Update the assistant message with error
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId
            ? { ...msg, content: `Error: ${errorMessage}` }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }

    return parsedResponse;
  }, [messages]);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsStreaming(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    messages,
    sendMessage,
    addMessage,
    isStreaming,
    error,
    reset,
  };
}

