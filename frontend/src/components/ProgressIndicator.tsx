interface ProgressIndicatorProps {
  message?: string;
}

export default function ProgressIndicator({ message = 'Processing...' }: ProgressIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8" role="status" aria-live="polite">
      <div className="relative w-20 h-20 mb-5">
        {/* Background circle */}
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 dark:border-blue-900/40 rounded-full"></div>
        
        {/* Animated spinner circle - smooth rotating arc */}
        <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 border-r-blue-600/50 dark:border-r-blue-400/50 rounded-full animate-spin"></div>
        
        {/* Inner pulsing dot for visual feedback */}
        <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
      </div>
      <p className="text-gray-800 dark:text-gray-200 font-medium text-lg">{message}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2" aria-hidden="true">
        This may take a few moments
      </p>
    </div>
  );
}

