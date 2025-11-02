interface ProgressIndicatorProps {
  message?: string;
}

export default function ProgressIndicator({ message = 'Processing...' }: ProgressIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8" role="status" aria-live="polite">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2" aria-hidden="true">
        This may take a few moments
      </p>
    </div>
  );
}

