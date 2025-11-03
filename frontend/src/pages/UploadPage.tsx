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
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12">
      <div className="max-w-3xl w-full mx-auto px-4">
        <Card>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Upload Document
        </h1>
        <p className="text-gray-800 dark:text-gray-200 mb-16 text-base leading-relaxed">
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

            <div className="mt-10 pt-6 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={() => navigate('/')}
                disabled={isUploading}
                className="
                  text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                  flex items-center gap-1.5
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1 -ml-2
                "
              >
                <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
                Back to Home
              </button>
            </div>
          </>
        )}
      </Card>
      </div>
    </div>
  );
}

