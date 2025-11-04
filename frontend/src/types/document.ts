export interface DocumentField {
  key: string;                    // snake_case unique identifier
  label: string;                  // Human-friendly display name
  type: string;                   // text|number|currency|date|email|address|signature
  originalPattern: string;        // EXACT placeholder text from document (includes brackets/underscores)
  description?: string;            // Short helpful note
  required?: boolean;              // Whether field is required
  exampleValue?: string;           // Example value based on legal norms
  legalSuggestions?: string;     // Short legal guidance
  question?: string;               // Intuitive question to ask the user (e.g., "What is the investor's email address?")
  value?: string;                  // User-provided value
}

export interface DocumentAnalysis {
  fields: DocumentField[];
  message?: string;
}

export interface AnalyzeResponse {
  filename: string;
  extractedText: string;
  documentHtml?: string; // HTML with styles preserved
  documentBuffer?: string; // Base64 encoded original docx buffer for download
  normalizedText?: string; // Text with placeholders normalized to {{key}} format
  normalizedHtml?: string; // HTML with placeholders normalized to {{key}} format
  normalizedDocumentBuffer?: string; // Base64 encoded docx with normalized placeholders
  aiAnalysis: DocumentAnalysis;
  documentSummary?: string; // AI-generated document summary
  placeholderCount?: number;
}

export interface FillRequest {
  text: string;
  html?: string; // HTML version for styled preview
  fields: DocumentField[];
}

export interface FillResponse {
  filledText: string;
  filledHtml?: string; // Filled HTML with styles preserved
}

// New unified fill/download response
export interface FillDocumentResponse {
  filledHtml: string | null; // Filled HTML for preview
  filledDocx: string | null; // Base64 encoded filled docx for download
}

