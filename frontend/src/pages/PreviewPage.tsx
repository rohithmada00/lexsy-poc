import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fillDocument } from '../services/api';
import Card from '../components/Card';
import DocumentPreview from '../components/DocumentPreview';
import Button from '../components/Button';
import ProgressIndicator from '../components/ProgressIndicator';
import type { DocumentField } from '../types';

export default function PreviewPage() {
  const navigate = useNavigate();
  const [filledText, setFilledText] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState<string>('');
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('filled-document.docx');

  useEffect(() => {
    // Load data from sessionStorage
    const storedFields = sessionStorage.getItem('filledFields');
    const storedText = sessionStorage.getItem('originalText');
    const storedAnalysis = sessionStorage.getItem('documentAnalysis');

    if (!storedFields || !storedText) {
      navigate('/chat');
      return;
    }

    const parsedFields: DocumentField[] = JSON.parse(storedFields);
    const parsedText: string = storedText;

    setFields(parsedFields);
    setOriginalText(parsedText);

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

    // Fill the document
    fillDocument(parsedText, parsedFields)
      .then((filled) => {
        setFilledText(filled);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fill document');
        setIsLoading(false);
      });
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Card>
          <ProgressIndicator message="Generating filled document..." />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
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
    <div className="max-w-4xl mx-auto px-4 py-16">
      <Card>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Document Preview
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Review your filled document below. You can download it as a .docx file or go back to make changes.
        </p>

        {filledText && (
          <DocumentPreview text={filledText} filename={filename} />
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700 flex gap-3 flex-wrap">
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
      </Card>
    </div>
  );
}

