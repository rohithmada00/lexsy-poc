export interface DocumentField {
  name: string;
  placeholder: string;
  suggestion: string;
  type: string;
  value?: string;
}

export interface DocumentAnalysis {
  fields: DocumentField[];
  message?: string;
}

export interface AnalyzeResponse {
  filename: string;
  extractedText: string;
  aiAnalysis: DocumentAnalysis;
}

export interface FillRequest {
  text: string;
  fields: DocumentField[];
}

export interface FillResponse {
  filledText: string;
}

