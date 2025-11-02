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
    <div className="flex gap-2 items-end border-t border-gray-200 dark:border-slate-700 pt-4">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="
          flex-1 resize-none rounded-lg border border-gray-300 dark:border-slate-600
          px-4 py-2 text-base
          bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        aria-label="Chat input"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="md"
        variant="primary"
        aria-label="Send message"
      >
        <span className="material-symbols-outlined">send</span>
      </Button>
    </div>
  );
}

