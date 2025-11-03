import { useState } from 'react';
import Button from './Button';
// @ts-expect-error - file-saver doesn't have types
import { saveAs } from 'file-saver';
import { downloadDocument, base64ToBlob } from '../services/api';
import type { DocumentField } from '../types';

interface DocumentPreviewProps {
  text: string;
  html?: string | null; // HTML with styles preserved
  filename?: string;
  documentBuffer?: string; // Base64 encoded original docx buffer
  fields?: DocumentField[]; // Filled fields for download
}

export default function DocumentPreview({
  text,
  html,
  filename = 'filled-document.docx',
  documentBuffer,
  fields = []
}: DocumentPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Check if we have filled docx buffer from the fill API call
      const filledDocxBuffer = sessionStorage.getItem('filledDocxBuffer');
      
      if (filledDocxBuffer) {
        // Use the already-filled docx from the fill API
        const blob = base64ToBlob(filledDocxBuffer);
        saveAs(blob, filename);
      } else if (documentBuffer && html && fields.length > 0) {
        // Fallback: Use normalized data to fill and download
        // This should not happen if PreviewPage correctly calls fillDocument
        const blob = await downloadDocument(documentBuffer, html, fields);
        saveAs(blob, filename);
      } else {
        // Fallback: Show error if data not available
        alert('Document data not available. Cannot download.');
        console.warn('Document buffer, HTML, or fields not available for download');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Document Preview Container */}
      <div className="bg-gray-100 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6 mb-4 overflow-auto max-h-[calc(100vh-300px)]">
        {/* Scrollable Container */}
        <div className="flex justify-center">
          {/* Paper-like Document View */}
          <div className="bg-white dark:bg-white rounded-lg shadow-2xl mx-auto w-full max-w-[8.5in] min-h-[11in] p-12 sm:p-16 relative transform transition-all">
            {/* Paper texture/shadow effect */}
            <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
              boxShadow: 'inset 0 0 80px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.05)',
            }}></div>

            {/* Document Content */}
            <div className="relative z-10">
              {(() => {
                // Validate that we're not displaying JSON accidentally
                const isTextJson = typeof text === 'string' && (text.trim().startsWith('{') || text.trim().startsWith('['));
                const isHtmlJson = html && typeof html === 'string' && (html.trim().startsWith('{') || html.trim().startsWith('['));

                if (isHtmlJson || isTextJson) {
                  try {
                    // Check if it's valid JSON
                    const testJson = isHtmlJson ? html : text;
                    JSON.parse(testJson!);
                    // It's JSON - don't render it
                    return (
                      <div className="document-preview p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-red-600 dark:text-red-400 font-semibold mb-2">⚠️ Invalid Content</p>
                        <p className="text-red-600 dark:text-red-400 text-sm">
                          Received invalid data format. Please try refreshing the page or contact support if this persists.
                        </p>
                      </div>
                    );
                  } catch {
                    // Not valid JSON, continue normally
                  }
                }

                // Normal rendering
                if (html) {
                  // Render HTML with styles preserved - document-like styling
                  return (
                    <div
                      className="document-preview"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  );
                } else {
                  // Fallback to plain text with document styling
                  return (
                    <div className="document-preview">
                      <pre className="whitespace-pre-wrap">
                        {text}
                      </pre>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Inline styles for document preview - preserve original alignment */}
      <style>{`
        .document-preview {
          font-family: Georgia, "Times New Roman", "DejaVu Serif", serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #000000;
          background: transparent;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        /* Only apply default styles to elements without inline styles */
        .document-preview * {
          color: inherit;
        }
        
        /* Paragraph styles - preserve original margins and alignment */
        .document-preview p {
          margin: 0 0 12pt 0;
          orphans: 3;
          widows: 3;
        }
        
        /* Do NOT override alignment - let inline styles from mammoth take precedence */
        /* Mammoth includes inline styles like style="text-align:center" which we preserve */
        /* Inline styles have higher specificity and will automatically override these defaults */
        
        /* Heading styles - preserve original alignment from inline styles */
        .document-preview h1, 
        .document-preview h2, 
        .document-preview h3, 
        .document-preview h4, 
        .document-preview h5, 
        .document-preview h6 {
          margin-top: 18pt;
          margin-bottom: 12pt;
          font-weight: bold;
          page-break-after: avoid;
        }
        
        .document-preview h1 {
          font-size: 16pt;
        }
        .document-preview h2 {
          font-size: 14pt;
        }
        .document-preview h3 {
          font-size: 13pt;
        }
        
        .document-preview strong, .document-preview b {
          font-weight: bold;
        }
        .document-preview em, .document-preview i {
          font-style: italic;
        }
        
        .document-preview ul, .document-preview ol {
          margin: 12pt 0;
          padding-left: 24pt;
        }
        .document-preview li {
          margin: 6pt 0;
        }
        
        .document-preview table {
          border-collapse: collapse;
          margin: 12pt 0;
          width: 100%;
          page-break-inside: avoid;
        }
        
        /* Table cell styles - preserve inline alignment from mammoth */
        .document-preview table td, 
        .document-preview table th {
          border: 1px solid #000;
          padding: 6pt;
        }
        
        /* Default left alignment only if no inline style */
        .document-preview table td:not([style]), 
        .document-preview table th:not([style]) {
          text-align: left;
        }
        
        .document-preview table th:not([style*="background"]) {
          font-weight: bold;
          background-color: #f5f5f5;
        }
        
        .document-preview pre {
          font-family: 'Courier New', monospace;
          font-size: 10pt;
          white-space: pre-wrap;
          word-wrap: break-word;
          background: transparent;
          border: none;
          padding: 0;
          margin: 0;
        }
        
        .document-preview blockquote {
          margin: 12pt 24pt;
          padding-left: 12pt;
          border-left: 3px solid #ccc;
          font-style: italic;
        }
        
        /* Important: Inline styles from mammoth have highest specificity */
        /* Elements with inline styles will automatically override CSS rules */
        /* This ensures alignment (center, right, justify) is preserved from original docx */
        
        @media print {
          .document-preview {
            background: white !important;
            color: #000 !important;
          }
        }
        
        @media (max-width: 768px) {
          .document-preview {
            font-size: 11pt;
          }
        }
      `}</style>

      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          variant="primary"
          size="md"
        >
          {isDownloading ? (
            <>
              <span className="material-symbols-outlined animate-spin mr-2">refresh</span>
              Generating...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined mr-2">download</span>
              Download .docx
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

