import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStreamingChat } from '../hooks/useStreamingChat';
import Card from '../components/Card';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';
import Button from '../components/Button';
import type { AnalyzeResponse, DocumentField } from '../types';
import type { ChatMessage as ChatMessageType } from '../types/chat';

export default function ChatPage() {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [allFieldsFilled, setAllFieldsFilled] = useState(false);
  const greetingInitializedRef = useRef(false);
  
  const { messages, sendMessage, addMessage, isStreaming, reset } = useStreamingChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load analysis from sessionStorage
    const stored = sessionStorage.getItem('documentAnalysis');
    if (!stored) {
      navigate('/upload');
      return;
    }

    const parsed: AnalyzeResponse = JSON.parse(stored);
    setAnalysis(parsed);
    setFields(parsed.aiAnalysis.fields || []);
  }, [navigate]);

  // Separate effect for initializing greeting - only run once
  useEffect(() => {
    if (!analysis || greetingInitializedRef.current || messages.length > 0) {
      return;
    }

    // Check if greeting already exists
    const hasGreeting = messages.some(msg => 
      msg.role === 'assistant' && 
      msg.content.includes("Hello! I'll help you fill in the placeholders")
    );

    if (hasGreeting) {
      greetingInitializedRef.current = true;
      return;
    }

    // Initialize chat with greeting message from AI (only once)
    if (analysis.aiAnalysis.fields && analysis.aiAnalysis.fields.length > 0) {
      greetingInitializedRef.current = true;
      const firstField = analysis.aiAnalysis.fields[0];
      const greeting = `Hello! I'll help you fill in the placeholders for your document. Let's start with "${firstField.name}". ${firstField.suggestion ? `I suggest "${firstField.suggestion}". ` : ''}What value would you like to use?`;
      
      // Add greeting as assistant message
      const greetingMsg: ChatMessageType = {
        id: Date.now().toString(),
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      };
      addMessage(greetingMsg);
    }
  }, [analysis, messages, addMessage]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = async (userMessage: string) => {
    if (!analysis) return;

    // Store the user message immediately (it will be added by the hook)
    // Process user message through streaming chat
    await sendMessage(userMessage, analysis.extractedText);

    // Wait a bit for streaming to complete, then process the response
    setTimeout(() => {
      // Extract value from user message (simple heuristic - could be improved)
      const currentField = fields[currentFieldIndex];
      if (currentField && currentFieldIndex < fields.length) {
        // Try to extract a value from the message
        // This is a simple implementation - could be improved with NLP
        const value = userMessage.trim();
        
        // Check if the message seems like a value (not a question)
        const isQuestion = value.toLowerCase().includes('what') || 
                          value.toLowerCase().includes('how') || 
                          value.toLowerCase().includes('?');
        
        if (value && !isQuestion && value.length > 0) {
          const updatedFields = [...fields];
          updatedFields[currentFieldIndex] = { ...currentField, value };
          setFields(updatedFields);

          // Move to next field
          if (currentFieldIndex < fields.length - 1) {
            setCurrentFieldIndex(currentFieldIndex + 1);
            const nextField = updatedFields[currentFieldIndex + 1];
            const nextQuestion = `Great! Now let's fill "${nextField.name}". ${nextField.suggestion ? `I suggest "${nextField.suggestion}". ` : ''}What value would you like to use?`;
            
            // Add AI response as message
            setTimeout(() => {
              const aiMsg: ChatMessageType = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: nextQuestion,
                timestamp: new Date(),
              };
              addMessage(aiMsg);
            }, 1000);
          } else {
            // All fields filled
            setAllFieldsFilled(true);
            setTimeout(() => {
              const completionMsg: ChatMessageType = {
                id: (Date.now() + 2).toString(),
                role: 'assistant',
                content: 'Perfect! I\'ve collected all the information. You can now proceed to preview and download your filled document.',
                timestamp: new Date(),
              };
              addMessage(completionMsg);
            }, 1000);
          }
        }
      }
    }, 2000); // Wait 2 seconds for streaming to complete
  };

  const handleProceedToPreview = () => {
    // Store filled fields for preview page
    sessionStorage.setItem('filledFields', JSON.stringify(fields));
    sessionStorage.setItem('originalText', analysis?.extractedText || '');
    navigate('/preview');
  };

  if (!analysis) {
    return (
      <div className="max-w-3xl w-full mx-auto px-4">
        <Card>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
        {/* Left Decorative Container */}
        <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-1/5 max-w-xs">
          <div className="h-full bg-gradient-to-r from-blue-50/45 via-indigo-50/25 to-transparent dark:from-blue-950/25 dark:via-indigo-950/15 relative overflow-hidden">
            <div className="absolute inset-0 opacity-25 dark:opacity-15">
              <div className="absolute top-1/4 left-1/4 w-36 h-36 rounded-full bg-blue-200 dark:bg-blue-900 blur-3xl"></div>
              <div className="absolute bottom-1/3 right-1/3 w-44 h-44 rounded-full bg-indigo-200 dark:bg-indigo-900 blur-3xl"></div>
            </div>
          </div>
        </div>

        {/* Right Decorative Container */}
        <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-1/5 max-w-xs">
          <div className="h-full bg-gradient-to-l from-blue-50/45 via-indigo-50/25 to-transparent dark:from-blue-950/25 dark:via-indigo-950/15 relative overflow-hidden">
            <div className="absolute inset-0 opacity-25 dark:opacity-15">
              <div className="absolute top-1/4 right-1/4 w-36 h-36 rounded-full bg-blue-200 dark:bg-blue-900 blur-3xl"></div>
              <div className="absolute bottom-1/3 left-1/3 w-44 h-44 rounded-full bg-indigo-200 dark:bg-indigo-900 blur-3xl"></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Document Assistant
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-baseline gap-2 flex-wrap">
                <span
                  className="truncate max-w-xs"
                  title={analysis.filename}
                >
                  {analysis.filename.length > 40 
                    ? `${analysis.filename.substring(0, 37)}...` 
                    : analysis.filename}
                </span>
                <span className="shrink-0">• {fields.length} placeholder{fields.length !== 1 ? 's' : ''} found</span>
              </p>
            </div>
            <Button
              onClick={() => {
                reset();
                navigate('/upload');
              }}
              variant="outline"
              size="sm"
              className="text-xs opacity-70 hover:opacity-100 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 shrink-0"
            >
              <span className="material-symbols-outlined mr-1.5 text-sm">refresh</span>
              Start Over
            </Button>
          </div>
          
          {fields.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {fields.map((field, idx) => (
                <span
                  key={idx}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium whitespace-nowrap inline-flex items-center ${
                    idx < currentFieldIndex
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                      : idx === currentFieldIndex
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
                  }`}
                >
                  {field.name}{field.value ? ' ✓' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages Container - Scrollable */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <div className="mb-4">
                <span className="material-symbols-outlined text-4xl opacity-50">chat</span>
              </div>
              <p className="text-base">Starting conversation...</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          
          {isStreaming && <TypingIndicator />}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Action Button (if all fields filled) */}
      {allFieldsFilled && !isStreaming && (
        <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <Button
              onClick={handleProceedToPreview}
              variant="primary"
              size="lg"
              className="w-full"
            >
              <span className="material-symbols-outlined mr-2">preview</span>
              Preview & Download Document
            </Button>
          </div>
        </div>
      )}

      {/* Sticky Chat Input at Bottom */}
      <div className="bg-gray-50 dark:bg-slate-900 sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <ChatInput
            onSend={handleSend}
            disabled={isStreaming}
            placeholder={isStreaming ? 'AI is typing...' : 'Ask anything'}
          />
        </div>
      </div>
    </div>
  );
}

