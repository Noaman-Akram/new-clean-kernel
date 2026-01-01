
import React, { useState, useRef, useEffect } from 'react';
import { AppState, ChatMessage, TaskStatus, HorizonGoal } from '../types';
import { Send, Bot, User, Zap, Settings, ChevronDown, Target, Plus, CheckCircle2, Circle } from 'lucide-react';
import { sendMessageToOpenRouter } from '../services/openRouterService';

interface Props {
  state: AppState;
  onChatUpdate: (history: ChatMessage[]) => void;
  onAddGoal: (title: string) => void;
  onUpdateGoal: (id: string, updates: Partial<any>) => void;
}

type AgentType = 'PROTOCOL' | 'GENERAL' | 'CUSTOM';

const AGENTS: Record<AgentType, { name: string; model: string; systemPrompt: (context: any) => string }> = {
  PROTOCOL: {
    name: 'Protocol Officer',
    model: 'deepseek/deepseek-r1-0528:free',
    systemPrompt: (context) => `
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
    `
  },
  GENERAL: {
    name: 'General Agent',
    model: 'deepseek/deepseek-r1-0528:free',
    systemPrompt: (context) => `
      You are a helpful, intelligent general assistant for Noeman.
      You have access to his current context and tasks to provide better answers.
      Be concise, professional, and helpful.
      
      CURRENT CONTEXT JSON: ${JSON.stringify(context)}
    `
  },
  CUSTOM: {
    name: 'Research Assistant',
    model: 'deepseek/deepseek-r1-0528:free',
    systemPrompt: () => `
      You are a dedicated Research Assistant. 
      Focus on providing deep, well-structured information, summaries, and code explanations.
    `
  }
};

const MentorView: React.FC<Props> = ({ state, onChatUpdate, onAddGoal, onUpdateGoal }) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>('PROTOCOL');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
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
      // Construct Context
      const context = {
        identity: "Noeman",
        current_time: new Date().toLocaleString(),
        tasks_pending: state.tasks
          .filter(t => t.status !== TaskStatus.DONE)
          .map(t => ({
            title: t.title,
            category: t.category,
            impact: t.impact,
            deadline: t.deadline ? new Date(t.deadline).toLocaleDateString() : 'None',
            is_overdue: t.deadline ? t.deadline < Date.now() : false
          })),
        metrics: state.metrics,
        prayers_logged: Object.keys(state.prayerLog).filter(k => k.includes(new Date().toISOString().split('T')[0])),
      };

      const agent = AGENTS[activeAgent];
      const systemPrompt = agent.systemPrompt(context);

      // Filter history for API to save tokens, keep last 10 turns
      const apiHistory = newHistory.slice(-10);

      const responseText = await sendMessageToOpenRouter(apiHistory, agent.model, systemPrompt);

      const modelMsg: ChatMessage = {
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      onChatUpdate([...newHistory, modelMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        role: 'model',
        text: "Connection to Neural Link failed. Check API configuration.",
        timestamp: Date.now()
      };
      onChatUpdate([...newHistory, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-background animate-fade-in relative">

      {/* GOALS SIDEBAR */}
      <div className="w-full md:w-64 border-r border-border bg-surface/30 flex flex-col shrink-0">
        <div className="h-12 border-b border-border px-4 flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Target size={14} /> Horizon</span>
          <button
            onClick={() => {
              const title = prompt("New Goal:");
              if (title) onAddGoal(title);
            }}
            className="hover:text-emerald-400 text-zinc-600"
          ><Plus size={14} /></button>
        </div>
        <div className="p-2 space-y-1 overflow-y-auto">
          {state.horizonGoals.map(g => (
            <div key={g.id} className="p-3 bg-zinc-900/50 rounded border border-zinc-800/50">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-zinc-200 font-medium">{g.title}</span>
                <button onClick={() => onUpdateGoal(g.id, { progress: g.progress >= 100 ? 0 : 100 })} className={g.progress >= 100 ? "text-emerald-500" : "text-zinc-700"}>
                  {g.progress >= 100 ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                </button>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500/50" style={{ width: `${g.progress}%` }}></div>
              </div>
            </div>
          ))}
          {state.horizonGoals.length === 0 && (
            <div className="p-4 text-[10px] text-zinc-600 text-center font-mono">No active horizon goals.</div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">

        {/* HEADER */}
        <div className="h-12 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-mono">
            <Zap size={14} className={activeAgent === 'PROTOCOL' ? "text-amber-500" : "text-blue-500"} />
            <div className="relative">
              <button
                onClick={() => setShowAgentMenu(!showAgentMenu)}
                className="flex items-center gap-2 hover:text-white transition-colors uppercase tracking-wider"
              >
                {AGENTS[activeAgent].name}
                <ChevronDown size={12} />
              </button>

              {showAgentMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-border rounded-md shadow-xl z-50 py-1">
                  {(Object.keys(AGENTS) as AgentType[]).map(key => (
                    <button
                      key={key}
                      onClick={() => { setActiveAgent(key); setShowAgentMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-mono hover:bg-zinc-800 transition-colors ${activeAgent === key ? 'text-white bg-zinc-800' : 'text-zinc-400'}`}
                    >
                      {AGENTS[key].name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-2">
            <span>MODEL: {AGENTS[activeAgent].model.split('/')[1]}</span>
            {isThinking && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
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
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                {activeAgent} computing...
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
              placeholder={`Message ${AGENTS[activeAgent].name}...`}
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
        </div>

      </div>

    </div>
  );
};

export default MentorView;
