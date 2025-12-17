import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { AnalysisResponse, ChatMessage } from '../types';
import { GenomicContext } from '../types/genomics';
import { ProteinChatSession, HistoryItem, VariantAnalysis } from '../services/geminiService';

interface ChatWidgetProps {
  analysisData: AnalysisResponse | VariantAnalysis | null;
  genomicData: GenomicContext | null; // Section 9.1
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ analysisData, genomicData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'model',
      text: 'Hello! I am Helix. I have analyzed the loaded protein structure. Ask me anything about the metrics or the mutation.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages); // Ref to access latest messages in useEffect
  
  // Update ref whenever messages change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Persistent chat session ref
  const chatSessionRef = useRef<ProteinChatSession | null>(null);

  // Determine variant ID safely from both types
  const currentVariantId = (analysisData as AnalysisResponse)?.variantId || (analysisData as VariantAnalysis)?.variant?.id;

  // Initialize/Reset chat session when analysis data changes
  useEffect(() => {
    if (analysisData) {
      // Section 9.1: Merge Genomic Data into Context
      const mergedContext = {
        ...analysisData,
        genomicContext: genomicData || { note: "Genomic context data not available." }
      };
      
      const contextJSON = JSON.stringify(mergedContext, null, 2);
      
      // Extract history from current messages to maintain conversation context across variant switches
      const history: HistoryItem[] = messagesRef.current
        .filter(m => m.id !== 'init' && m.id !== 'loading') // Filter out system/loading messages
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      chatSessionRef.current = new ProteinChatSession(contextJSON, history);
      
      // Notify user that context has updated if chat is already active
      if (messagesRef.current.length > 1) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: `I've updated my context to focus on ${currentVariantId || 'the new variant'}.`,
          timestamp: new Date()
        }]);
      }
    } else {
      chatSessionRef.current = null;
    }
  }, [currentVariantId, genomicData]); // Re-init if variant changes or genomic data arrives late

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    let fullResponse = "";
    
    // Create a temporary message for streaming
    const responseId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: responseId,
      role: 'model',
      text: '',
      timestamp: new Date()
    }]);

    try {
      const stream = chatSessionRef.current.sendMessage(userMsg.text);

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => prev.map(m => 
          m.id === responseId ? { ...m, text: fullResponse } : m
        ));
      }
    } catch (e) {
        setMessages(prev => prev.map(m => 
            m.id === responseId ? { ...m, text: "I encountered an error connecting to the AI service." } : m
        ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 bg-primary hover:bg-primary-hover text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50 animate-bounce"
        aria-label="Open AI Assistant"
      >
        <MessageCircle className="h-7 w-7" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="bg-scientific-blue/20 p-1.5 rounded-lg">
            <Bot className="h-5 w-5 text-scientific-blue" />
          </div>
          <span className="font-semibold text-white">Helix AI Assistant</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-none'
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-slate-800 text-slate-400 text-xs px-3 py-2 rounded-lg rounded-bl-none animate-pulse">
               Thinking...
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-850 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={analysisData ? "Ask about conservation or RMSD..." : "Select a variant first..."}
            disabled={!analysisData || isTyping}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!analysisData || isTyping || !input.trim()}
            className="bg-primary hover:bg-primary-hover disabled:bg-slate-700 text-white p-2 rounded-lg transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;