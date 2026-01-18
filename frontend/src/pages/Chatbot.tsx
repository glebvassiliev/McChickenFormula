import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Send, Bot, User, Sparkles, 
  Lightbulb, RefreshCw, Mic
} from 'lucide-react';
import clsx from 'clsx';

interface ChatbotProps {
  sessionKey: number | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Chatbot({ sessionKey }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "I'm your AI Strategy Engineer. I can help with tire strategy, pit stop timing, weather analysis, and race tactics. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickQueries, setQuickQueries] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/chatbot/quick-queries')
      .then(res => res.json())
      .then(data => setQuickQueries(data.queries || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chatbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })),
          context: sessionKey ? { session_key: sessionKey } : null
        })
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting. Please check if the backend is running and try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "Chat cleared. I'm ready to help with your F1 strategy questions!",
      timestamp: new Date()
    }]);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-racing-red to-red-700 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-racing text-xl">AI STRATEGY ENGINEER</h1>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Powered by Gemini AI
              </p>
            </div>
          </div>
          <button 
            onClick={clearChat}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Clear Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 card p-4 overflow-y-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={clsx(
                  'flex gap-3',
                  message.role === 'user' && 'flex-row-reverse'
                )}
              >
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  message.role === 'assistant' 
                    ? 'bg-racing-red' 
                    : 'bg-carbon-light border border-white/20'
                )}>
                  {message.role === 'assistant' 
                    ? <Bot className="w-4 h-4" />
                    : <User className="w-4 h-4" />
                  }
                </div>
                <div className={clsx(
                  'max-w-[80%] p-4 rounded-lg',
                  message.role === 'assistant'
                    ? 'bg-carbon/80 border border-white/10'
                    : 'bg-racing-red/20 border border-racing-red/30'
                )}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    {message.content.split('\n').map((line, i) => (
                      <p key={i} className={clsx(
                        'mb-2 last:mb-0',
                        line.startsWith('**') && 'font-bold',
                        line.startsWith('-') && 'ml-4'
                      )}>
                        {line.replace(/\*\*/g, '')}
                      </p>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-racing-red flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-carbon/80 border border-white/10 p-4 rounded-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-racing-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-racing-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-racing-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="mt-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about tire strategy, pit timing, weather, overtaking..."
                className="input-field pr-12 resize-none h-14 py-4"
                rows={1}
              />
              <button 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Queries Sidebar */}
      <div className="w-80 space-y-4">
        <div className="card p-4">
          <h3 className="font-racing text-sm mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-tire-medium" />
            QUICK QUERIES
          </h3>
          
          <div className="space-y-4">
            {quickQueries.map((category, i) => (
              <div key={i}>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  {category.category}
                </p>
                <div className="space-y-1">
                  {category.queries?.slice(0, 3).map((query: string, j: number) => (
                    <button
                      key={j}
                      onClick={() => sendMessage(query)}
                      className="w-full text-left px-3 py-2 text-sm bg-carbon/50 hover:bg-carbon rounded-lg transition-colors border border-transparent hover:border-racing-red/30"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Context */}
        {sessionKey && (
          <div className="card p-4">
            <h3 className="font-racing text-sm mb-3">SESSION CONTEXT</h3>
            <div className="flex items-center gap-2 p-2 bg-timing-green/10 rounded-lg border border-timing-green/30">
              <div className="w-2 h-2 bg-timing-green rounded-full live-pulse" />
              <span className="text-sm">Session {sessionKey} active</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              AI will use live session data for context-aware responses
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="card p-4">
          <h3 className="font-racing text-sm mb-3">TIPS</h3>
          <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-racing-red">•</span>
              Ask specific questions for better answers
            </li>
            <li className="flex items-start gap-2">
              <span className="text-racing-red">•</span>
              Include lap numbers and tire ages
            </li>
            <li className="flex items-start gap-2">
              <span className="text-racing-red">•</span>
              Mention weather conditions if relevant
            </li>
            <li className="flex items-start gap-2">
              <span className="text-racing-red">•</span>
              Specify gaps to competitors for overtake analysis
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
