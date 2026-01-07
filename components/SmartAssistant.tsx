
import React, { useState, useRef, useEffect } from 'react';
import { AssistantMessage } from '../types';
import { getAssistantResponse } from '../services/geminiService';

interface SmartAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const SmartAssistant: React.FC<SmartAssistantProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: 'model', text: 'Olá! Sou o assistente inteligente da Nutrabene. Como posso ajudar na sua jornada de saúde capilar hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: AssistantMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const response = await getAssistantResponse([...messages, userMessage]);
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setIsTyping(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 w-full sm:w-[400px] h-full sm:h-[600px] bg-white dark:bg-background-dark sm:rounded-3xl shadow-2xl flex flex-col border border-primary/20 overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-10">
      {/* Header */}
      <div className="bg-primary p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined">smart_toy</span>
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">NutraAssistant</h3>
            <p className="text-[10px] opacity-80">Especialista em Nutrição Capilar</p>
          </div>
        </div>
        <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-all">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-background-soft/50 dark:bg-background-dark/50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-tr-none shadow-md' 
                : 'bg-white dark:bg-white/5 border border-primary/10 text-dark-text dark:text-gray-200 rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-white/5 p-4 rounded-2xl rounded-tl-none border border-primary/10 shadow-sm flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce delay-150"></span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-primary/10 bg-white dark:bg-background-dark flex gap-2">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tire suas dúvidas aqui..."
          className="flex-1 h-12 bg-background-soft dark:bg-white/5 border-none rounded-xl px-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
        />
        <button 
          type="submit"
          disabled={!input.trim() || isTyping}
          className="w-12 h-12 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-soft flex items-center justify-center transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </form>
    </div>
  );
};

export default SmartAssistant;
