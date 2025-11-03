import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fillDocument, downloadDocument } from '../services/api';
import Card from '../components/Card';
import DocumentPreview from '../components/DocumentPreview';
import Button from '../components/Button';
import ProgressIndicator from '../components/ProgressIndicator';
import type { DocumentField } from '../types';

export default function PreviewPage() {
  const navigate = useNavigate();
  const [filledText, setFilledText] = useState<string | null>(null);
  const [filledHtml, setFilledHtml] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState<string>('');
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [documentBuffer, setDocumentBuffer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('filled-document.docx');

  useEffect(() => {
    // Load data from sessionStorage - prefer normalized data from analyze API
    const storedFields = sessionStorage.getItem('filledFields');
    const storedNormalizedHtml = sessionStorage.getItem('normalizedHtml');
    const storedNormalizedBuffer = sessionStorage.getItem('normalizedDocumentBuffer');
    const storedAnalysis = sessionStorage.getItem('documentAnalysis');

    // Fallback to original data if normalized data not available (backward compatibility)
    const storedHtml = sessionStorage.getItem('originalHtml');
    const storedBuffer = sessionStorage.getItem('originalBuffer');
    const storedText = sessionStorage.getItem('originalText');

    if (!storedFields) {
      navigate('/chat');
      return;
    }

    const parsedFields: DocumentField[] = JSON.parse(storedFields);
    setFields(parsedFields);

    // Get filename from analysis if available
    if (storedAnalysis) {
      try {
        const analysis = JSON.parse(storedAnalysis);
        if (analysis.filename) {
          const baseName = analysis.filename.replace('.docx', '');
          setFilename(`${baseName}-filled.docx`);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Use normalized data if available, otherwise fall back to original
    const normalizedHtml = storedNormalizedHtml || storedHtml;
    const normalizedBuffer = storedNormalizedBuffer || storedBuffer;

    if (!normalizedBuffer || !normalizedHtml) {
      setError('Missing normalized data. Please re-analyze the document.');
      setIsLoading(false);
      return;
    }

    // Store buffer for download component
    setDocumentBuffer(normalizedBuffer);
    setOriginalText(storedText || '');

    // Fill the document using normalized data (call download API with normalized data)
    fillDocument(normalizedBuffer, normalizedHtml, parsedFields, 'both')
      .then((result) => {
        // Validate that filledHtml is a string, not JSON
        let validFilledHtml = result.filledHtml || null;

        // Check if filledHtml is actually JSON
        if (validFilledHtml && typeof validFilledHtml === 'string' && (validFilledHtml.trim().startsWith('{') || validFilledHtml.trim().startsWith('['))) {
          try {
            JSON.parse(validFilledHtml);
            console.error('Received JSON instead of filled HTML:', validFilledHtml.substring(0, 200));
            validFilledHtml = null;
          } catch {
            // Not valid JSON, continue
          }
        }

        // For preview, we use filledHtml (if available) or fall back to text
        // Note: We don't have filledText from the new API, only filledHtml and filledDocx
        setFilledText(null); // We'll rely on HTML for preview
        setFilledHtml(validFilledHtml);
        
        // Store filled docx in sessionStorage for download component
        if (result.filledDocx) {
          sessionStorage.setItem('filledDocxBuffer', result.filledDocx);
        }
        
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Fill document error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fill document');
        setIsLoading(false);
      });
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="max-w-4xl w-full mx-auto px-4">
        <Card>
          <ProgressIndicator message="Generating filled document..." />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl w-full mx-auto px-4">
        <Card>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
          <Button onClick={() => navigate('/chat')} variant="outline">
            <span className="material-symbols-outlined mr-2">arrow_back</span>
            Back to Chat
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-8">
      <div className="max-w-6xl w-full mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Document Preview
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review your filled document below. You can download it as a .docx file or go back to make changes.
          </p>
        </div>

        {(filledHtml || filledText) && (
          <DocumentPreview 
            text={filledText || ''} 
            html={filledHtml || null}
            filename={filename}
            documentBuffer={documentBuffer || undefined}
            fields={fields}
          />
        )}

        <div className="mt-6 pt-6 flex gap-3 flex-wrap">
          <Button
            onClick={() => navigate('/chat')}
            variant="outline"
            size="md"
          >
            <span className="material-symbols-outlined mr-2">edit</span>
            Edit Again
          </Button>
          <Button
            onClick={() => {
              sessionStorage.clear();
              navigate('/');
            }}
            variant="secondary"
            size="md"
          >
            <span className="material-symbols-outlined mr-2">home</span>
            Start Over
          </Button>
        </div>
      </div>
    </div>
  );
}

