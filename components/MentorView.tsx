
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppState, ChatMessage, TaskStatus } from '../types';
import { Send, Bot, User, Zap } from 'lucide-react';

interface Props {
  state: AppState;
  onChatUpdate: (history: ChatMessage[]) => void;
}

const MentorView: React.FC<Props> = ({ state, onChatUpdate }) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.chatHistory]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    const newHistory = [...state.chatHistory, userMsg];
    onChatUpdate(newHistory);
    setInput('');
    setIsThinking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Construct Context
      const context = {
        identity: "Noeman",
        role: "Strict Accountability Mentor",
        tasks_pending: state.tasks.filter(t => t.status === TaskStatus.TODO).map(t => `${t.category}: ${t.title}`),
        metrics: state.metrics,
        recent_transactions: state.transactions.slice(0, 3),
        prayers_logged: Object.keys(state.prayerLog).filter(k => k.includes(new Date().toISOString().split('T')[0])),
        psychology: "Avoids sales. Works best with mono-focus. Needs external pressure.",
        goal: "Hit $1000/mo from Agency to quit Zoho."
      };

      const systemInstruction = `
        You are the 'Protocol' AI for Noeman. 
        Noeman is a 24yo software engineer working 3 jobs (Zoho, Freelance, Agency).
        He avoids sales/outreach for his Agency because of fear of rejection.
        He distracts himself by 'building' or 'planning' instead of doing the work.
        
        YOUR RULES:
        1. Be firm, concise, and direct. Do not be overly polite.
        2. Call out his avoidance patterns immediately.
        3. Check if he has done his prayers (Salah).
        4. Remind him his goal is $1000 profit to quit the 9-5.
        5. If he talks about 'planning' or 'refactoring', tell him to stop and go sell.
        6. Use short sentences. "Linear" style communication.
        
        CURRENT CONTEXT JSON: ${JSON.stringify(context)}
      `;

      // Filter history for API to save tokens, keep last 10 turns
      const apiHistory = newHistory.slice(-10).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: apiHistory,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
        }
      });

      const modelMsg: ChatMessage = {
        role: 'model',
        text: response.text || "Protocol error. Re-engage.",
        timestamp: Date.now()
      };

      onChatUpdate([...newHistory, modelMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        role: 'model',
        text: "Connection to Protocol server failed. Check network.",
        timestamp: Date.now()
      };
      onChatUpdate([...newHistory, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in">
      
      {/* HEADER */}
      <div className="h-12 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
         <div className="flex items-center gap-2 text-zinc-300 text-sm font-mono">
            <Zap size={14} className="text-amber-500" />
            <span>PROTOCOL // ACTIVE</span>
         </div>
         <div className="text-[10px] font-mono text-zinc-500">
            AI_MODEL: GEMINI-2.5-FLASH
         </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {state.chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`
                    w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border
                    ${msg.role === 'model' ? 'bg-zinc-900 border-zinc-800 text-emerald-500' : 'bg-zinc-100 border-white text-black'}
                `}>
                    {msg.role === 'model' ? <Bot size={16} /> : <User size={16} />}
                </div>
                
                <div className={`
                    max-w-[80%] text-sm leading-relaxed p-4 rounded-md border
                    ${msg.role === 'model' 
                        ? 'bg-surface border-border text-zinc-300 font-mono' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-200'}
                `}>
                    {msg.text}
                    <div className="mt-2 text-[10px] opacity-30 font-mono uppercase">
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
            </div>
        ))}
        {isThinking && (
             <div className="flex gap-4">
                 <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border bg-zinc-900 border-zinc-800 text-emerald-500 animate-pulse">
                    <Bot size={16} />
                 </div>
                 <div className="flex items-center text-xs font-mono text-zinc-600">
                    Protocol computing...
                 </div>
             </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="p-6 bg-background border-t border-border shrink-0">
         <div className="relative max-w-3xl mx-auto">
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Report status or ask for directives..."
                className="w-full bg-surface border border-border rounded-md py-3 pl-4 pr-12 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 outline-none transition-colors font-mono"
                disabled={isThinking}
            />
            <button 
                onClick={handleSend}
                disabled={isThinking || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-50 transition-colors"
            >
                <Send size={16} />
            </button>
         </div>
         <div className="text-center mt-2 text-[10px] text-zinc-600 font-mono">
            Honesty is required for system optimization.
         </div>
      </div>

    </div>
  );
};

export default MentorView;
