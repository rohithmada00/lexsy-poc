# Lexsy Backend

Backend server for the Lexsy document analysis application.

## Features

- **Document Analysis**: Upload and analyze .docx files to extract placeholders
- **AI Chat**: Conversational assistant to help fill in document fields
- **Document Filling**: Automatically fill placeholders with provided values

## API Endpoints

### `POST /api/analyze`
Upload and analyze a .docx document to extract placeholders and suggested values.

**Request**: Multipart form data with `document` file
**Response**: 
```json
{
  "filename": "document.docx",
  "extractedText": "...",
  "aiAnalysis": {
    "fields": [...],
    "message": "..."
  }
}
```

### `POST /api/chat`
Chat with the AI assistant for help filling document fields. Supports both streaming and non-streaming modes.

**Request**: 
- Query parameter: `?stream=true` to enable streaming (Server-Sent Events)
- Body:
```json
{
  "messages": [...],
  "context": "..."
}
```

**Non-streaming mode** (default):
**Response**:
```json
{
  "message": "AI response..."
}
```

**Streaming mode** (`?stream=true`):
Returns Server-Sent Events (SSE) stream with real-time responses:
```
data: {"content":"Hello"}
data: {"content":" there"}
data: {"content":"!"}
data: {"done":true}
```

Example usage:
```javascript
// Streaming
const response = await fetch('/api/chat?stream=true', {
  method: 'POST',
  body: JSON.stringify({ messages: [...] })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Process SSE chunks
}
```

### `POST /api/fill`
Fill document placeholders with provided values.

**Request**:
```json
{
  "text": "Document text...",
  "fields": [
    { "name": "Company Name", "value": "Acme Corp" },
    ...
  ]
}
```

**Response**:
```json
{
  "filledText": "Filled document text..."
}
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=your_actual_api_key_here
```

4. Start the server:
```bash
npm start
```

The server will run on `http://localhost:3001` (or the port specified in `.env`).

## Dependencies

- **express**: Web server framework
- **multer**: File upload handling
- **mammoth**: Extract text from .docx files
- **openai**: OpenAI API client
- **cors**: Enable cross-origin requests
- **dotenv**: Environment variable management

