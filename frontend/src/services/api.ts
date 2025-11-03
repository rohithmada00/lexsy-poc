import type { AnalyzeResponse, FillDocumentResponse, ChatRequest, ChatResponse, StreamChunk, DocumentField } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Document Analysis
export async function analyzeDocument(file: File): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append('document', file);

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze document');
  }

  return response.json();
}

// Chat (Non-streaming)
export async function sendChatMessage(
  messages: ChatRequest['messages'],
  context?: ChatRequest['context']
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, context }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Chat request failed');
  }

  const data: ChatResponse = await response.json();
  return data;
}

// Streaming Chat
export async function* streamChat(
  messages: ChatRequest['messages'],
  context?: ChatRequest['context']
): AsyncGenerator<StreamChunk, void, unknown> {
  const response = await fetch(`${API_BASE_URL}/api/chat?stream=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, context }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Chat request failed');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data;
          } catch (e) {
            console.error('Failed to parse SSE data:', line);
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.startsWith('data: ')) {
      try {
        const data = JSON.parse(buffer.slice(6));
        yield data;
      } catch (e) {
        // Ignore parse errors for incomplete chunks
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Fill Document (for preview and download) - Uses normalized data from analyze API
// Returns both filled HTML for preview and filled docx as base64 for download
export async function fillDocument(
  normalizedDocumentBuffer: string,
  normalizedHtml: string,
  fields: DocumentField[],
  format: 'preview' | 'download' | 'both' = 'both'
): Promise<FillDocumentResponse> {
  // Transform fields to match backend expectations
  const transformedFields = fields.map(f => ({
    key: f.key,
    value: f.value,
    suggestion: f.exampleValue, // Map exampleValue to suggestion
  }));

  const response = await fetch(`${API_BASE_URL}/api/download?format=${format}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      normalizedDocumentBuffer,
      normalizedHtml,
      fields: transformedFields
    }),
  });

  if (!response.ok) {
    // Handle 413 Payload Too Large error with specific message
    if (response.status === 413) {
      throw new Error('Document is too large to process. Please try with a smaller document.');
    }

    // Try to parse error response, but handle HTML error pages gracefully
    let errorMessage = `Server error (${response.status}): ${response.statusText}`;
    try {
      const contentType = response.headers.get('content-type');
      // Only try to parse JSON if content-type indicates JSON
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      }
      // If HTML error page, use status-based message (already set above)
    } catch (e) {
      // If parsing fails (e.g., HTML error page), use status-based message
      // errorMessage is already set to status-based message
    }
    throw new Error(errorMessage);
  }

  // If format is 'download', return blob (legacy behavior)
  if (format === 'download') {
    const blob = await response.blob();
    // Convert blob to base64 for consistency
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve({
          filledHtml: null,
          filledDocx: base64.split(',')[1] || base64, // Remove data:... prefix if present
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Return JSON response with both filledHtml and filledDocx (base64)
  const data: FillDocumentResponse = await response.json();
  return data;
}

// Helper function to convert base64 to Blob for download
export function base64ToBlob(base64: string, contentType: string = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

// Download Filled Document (preserves all original formatting)
// Convenience wrapper that converts base64 to blob and triggers download
export async function downloadDocument(
  normalizedDocumentBuffer: string,
  normalizedHtml: string,
  fields: DocumentField[]
): Promise<Blob> {
  const result = await fillDocument(normalizedDocumentBuffer, normalizedHtml, fields, 'both');

  if (!result.filledDocx) {
    throw new Error('Failed to generate filled document');
  }

  return base64ToBlob(result.filledDocx);
}

