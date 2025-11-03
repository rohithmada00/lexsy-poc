import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import Button from './Button';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled = false, placeholder = 'Type your message...' }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="
      flex items-center gap-2
      border border-gray-300 dark:border-slate-600
      rounded-full
      px-2 py-2
      transition-all
    ">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="
          flex-1 resize-none
          px-4 py-2 text-base leading-relaxed
          bg-transparent
          text-gray-900 dark:text-gray-100
          placeholder:text-gray-500 dark:placeholder:text-gray-400
          focus:outline-none
          disabled:opacity-50 disabled:cursor-not-allowed
          max-h-32 overflow-y-auto
        "
        aria-label="Chat input"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="
          flex items-center justify-center
          w-10 h-10 rounded-full
          bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700
          text-white
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          focus:outline-none
          shrink-0
        "
        aria-label="Send message"
      >
        <span className="material-symbols-outlined text-lg">arrow_upward</span>
      </button>
    </div>
  );
}

