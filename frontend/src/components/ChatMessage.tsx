import type { ChatMessage as ChatMessageType } from '../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Simple markdown parser for bold text (**text**)
  const parseMarkdown = (text: string): string => {
    // Convert **text** to <strong>text</strong>
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  const formattedContent = parseMarkdown(message.content);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 last:mb-0`}>
      <div className={`
        max-w-[85%] sm:max-w-[75%] leading-relaxed
        ${isUser 
          ? 'rounded-2xl px-4 py-3 bg-blue-600 text-white dark:bg-blue-600 shadow-sm' 
          : 'px-2 py-2 text-gray-900 dark:text-gray-100'
        }
      `}>
        <div 
          className="whitespace-pre-wrap break-words text-base"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
        {/* Timestamp - Commented out, uncomment to restore */}
        {/* <div className={`text-xs mt-2 ${isUser ? 'text-blue-100 opacity-90' : 'text-gray-600 dark:text-gray-400 opacity-80'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div> */}
      </div>
    </div>
  );
}

