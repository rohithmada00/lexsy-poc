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
  const [greetingInitialized, setGreetingInitialized] = useState(false);
  
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

    // Initialize chat with greeting message from AI (only once)
    if (parsed.aiAnalysis.fields && parsed.aiAnalysis.fields.length > 0 && !greetingInitialized && messages.length === 0) {
      setGreetingInitialized(true);
      const firstField = parsed.aiAnalysis.fields[0];
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
  }, [navigate, messages.length, greetingInitialized, addMessage]);

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
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Card>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <Card className="flex flex-col h-[600px] max-h-[80vh]">
        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Chat Assistant
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Document: {analysis.filename} • {fields.length} placeholder{fields.length !== 1 ? 's' : ''} found
          </p>
          {fields.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-2 flex-wrap">
                {fields.map((field, idx) => (
                  <span
                    key={idx}
                    className={`text-xs px-2 py-1 rounded ${
                      idx < currentFieldIndex
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : idx === currentFieldIndex
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                    }`}
                  >
                    {field.name} {field.value ? '✓' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto mb-4 px-2"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p>Starting conversation...</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          
          {isStreaming && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={isStreaming ? 'AI is typing...' : 'Type your response...'}
        />

        {allFieldsFilled && !isStreaming && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
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
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <Button
            onClick={() => {
              reset();
              navigate('/upload');
            }}
            variant="outline"
            size="sm"
          >
            <span className="material-symbols-outlined mr-2">refresh</span>
            Start Over
          </Button>
        </div>
      </Card>
    </div>
  );
}

