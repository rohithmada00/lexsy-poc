import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeDocument } from '../services/api';
import FileUpload from '../components/FileUpload';
import Card from '../components/Card';
import ProgressIndicator from '../components/ProgressIndicator';
import Button from '../components/Button';
import type { AnalyzeResponse } from '../types';

export default function UploadPage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const response: AnalyzeResponse = await analyzeDocument(file);
      
      // Store analysis data in sessionStorage for use in chat page
      sessionStorage.setItem('documentAnalysis', JSON.stringify(response));
      
      // Navigate to chat page
      navigate('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze document');
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Card>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Upload Document
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Upload your .docx legal document to begin. We'll analyze it and identify all placeholders that need to be filled.
        </p>

        {isUploading ? (
          <ProgressIndicator message="Analyzing document..." />
        ) : (
          <>
            <FileUpload
              onFileSelect={handleFileSelect}
              accept=".docx"
              disabled={isUploading}
            />
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="sm"
                disabled={isUploading}
              >
                <span className="material-symbols-outlined mr-2">arrow_back</span>
                Back to Home
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

