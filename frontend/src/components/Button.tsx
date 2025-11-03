import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white shadow-lg hover:shadow-xl focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 dark:active:bg-blue-800',
    secondary: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg hover:shadow-xl focus:ring-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:active:bg-emerald-700',
    outline: 'border-2 border-blue-700 text-blue-700 hover:bg-blue-50 hover:border-blue-800 active:bg-blue-100 focus:ring-blue-500 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:border-blue-400 dark:active:bg-blue-900/40',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} flex items-center justify-center ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

