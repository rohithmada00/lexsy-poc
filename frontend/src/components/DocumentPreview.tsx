import { useState } from 'react';
import Button from './Button';
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx';
// @ts-expect-error - file-saver doesn't have types
import { saveAs } from 'file-saver';

interface DocumentPreviewProps {
  text: string;
  filename?: string;
}

export default function DocumentPreview({ text, filename = 'filled-document.docx' }: DocumentPreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Create a simple .docx document from the text
      // Split text into paragraphs (by newlines)
      const paragraphs = text.split('\n').map(line => 
        new Paragraph({
          children: [new TextRun(line || ' ')],
        })
      );

      // If no paragraphs, create at least one
      if (paragraphs.length === 0) {
        paragraphs.push(new Paragraph({
          children: [new TextRun(text || ' ')],
        }));
      }

      const doc = new DocxDocument({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, filename);
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Failed to generate document. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-6 mb-4">
        <div className="prose dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
            {text}
          </pre>
        </div>
      </div>
      
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

