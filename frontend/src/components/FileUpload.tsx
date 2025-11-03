import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import Button from './Button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export default function FileUpload({ onFileSelect, accept = '.docx', disabled = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    
    if (!file.name.endsWith('.docx')) {
      setError('Please upload a .docx file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-300
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-xl scale-[1.02] ring-4 ring-blue-200 dark:ring-blue-900/40' 
            : 'border-gray-400 dark:border-slate-500 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:shadow-lg hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-900/30'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload document"
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
          aria-label="File input"
        />
        
        <span className={`material-symbols-outlined text-6xl mb-5 block transition-all duration-300 ${
          isDragging 
            ? 'text-blue-600 dark:text-blue-400 scale-110' 
            : 'text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300'
        }`}>
          upload_file
        </span>
        
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Drag and drop your .docx file here
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          or <span className="text-blue-600 dark:text-blue-400 font-medium underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">click to browse</span>
        </p>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

