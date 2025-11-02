import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-2xl p-8 border-2 border-gray-200 dark:border-slate-700 transition-shadow duration-300 hover:shadow-2xl dark:hover:shadow-3xl ${className}`}>
      {children}
    </div>
  );
}

