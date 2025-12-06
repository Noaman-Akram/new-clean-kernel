

import React, { useState } from 'react';
import { AppState, Client, EntityContext, EntityType, Transaction, Category, PersonalCircle } from '../types';
import { generateId } from '../utils';
import { 
    Plus,
    MoreHorizontal,
    Users,
    Briefcase,
    Star,
    Building2,
    Wallet,
    DollarSign,
    User,
    ArrowUpRight,
    ArrowDownLeft,
    Search,
    X,
    Tag,
    Hash,
    Heart,
    Zap,
    Coffee
} from 'lucide-react';

interface Props {
  state: AppState;
  onUpdate: (id: string, updates: Partial<Client>) => void;
  onAdd: (client: Client) => void;
  onAddTransaction: (tx: Transaction) => void;
}

const NetworkView: React.FC<Props> = ({ state, onUpdate, onAdd, onAddTransaction }) => {
    // --- STATE ---
    const [context, setContext] = useState<EntityContext>('NEMO'); // NEMO vs PERSONAL
    const [activeTab, setActiveTab] = useState<EntityType>('TEAM'); // Default tab for NEMO
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Financial Action State
    const [finAction, setFinAction] = useState<{ entityId: string, type: 'PAY' | 'INVOICE', name: string } | null>(null);
    const [finAmount, setFinAmount] = useState('');

    // --- LOGIC ---

    // Filter Logic
    const filteredList = state.clients.filter(c => {
        if (c.context !== context) return false;
        // If NEMO, show tabs. If PERSONAL, show generic list (filtered by types if we add tabs later)
        if (context === 'NEMO') return c.type === activeTab;
        if (context === 'PERSONAL') return true; 
        return true;
    });

    // Helper: Get Financial Stats from Ledger
    const getFinancials = (entityId: string) => {
        const txs = state.transactions.filter(t => t.relatedEntityId === entityId);
        const total = txs.reduce((sum, t) => sum + t.amount, 0);
        return { total, count: txs.length };
    };

    const handleFinancialSubmit = () => {
        if(!finAction || !finAmount) return;
        
        const amount = parseFloat(finAmount);
        if(!amount) return;

        const isPay = finAction.type === 'PAY'; // Expense
        const category = context === 'NEMO' ? Category.AGENCY : Category.FREELANCE;

        onAddTransaction({
            id: generateId(),
            amount: amount, 
            date: Date.now(),
            description: `${isPay ? 'Payment to' : 'Invoice from'} ${finAction.name}`,
            type: isPay ? 'EXPENSE' : 'INCOME',
            category: category,
            relatedEntityId: finAction.entityId
        });

        setFinAction(null);
        setFinAmount('');
    };

    return (
        <div className="h-full flex flex-col animate-fade-in bg-background relative">
             
             {/* --- TOP HEADER: CONTEXT SWITCHER --- */}
             <div className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-20">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => { setContext('NEMO'); setActiveTab('TEAM'); }}
                        className={`flex items-center gap-2 text-sm font-bold tracking-wide transition-colors ${context === 'NEMO' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        <Building2 size={16} /> NEMO (AGENCY)
                    </button>
                    <div className="h-4 w-px bg-zinc-800"></div>
                    <button 
                        onClick={() => { setContext('PERSONAL'); setActiveTab('NETWORK'); }}
                        className={`flex items-center gap-2 text-sm font-bold tracking-wide transition-colors ${context === 'PERSONAL' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        <User size={16} /> PERSONAL
                    </button>
                </div>

                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-black rounded-md text-xs font-bold hover:bg-zinc-200 transition-colors"
                >
                    <Plus size={14} />
                    <span>ADD ENTRY</span>
                </button>
            </div>

            {/* --- SUB TABS (AGENCY ONLY) --- */}
            {context === 'NEMO' && (
                <div className="px-6 border-b border-border bg-background/50 backdrop-blur-sm flex gap-6">
                    <TabItem active={activeTab === 'TEAM'} onClick={() => setActiveTab('TEAM')} label="TEAM & HR" icon={<Users size={14}/>} />
                    <TabItem active={activeTab === 'CANDIDATE'} onClick={() => setActiveTab('CANDIDATE')} label="RECRUITMENT" icon={<Star size={14}/>} />
                    <TabItem active={activeTab === 'CLIENT'} onClick={() => setActiveTab('CLIENT')} label="CLIENTS & CRM" icon={<Briefcase size={14}/>} />
                </div>
            )}

            {/* --- CONTENT AREA --- */}
            <div className="flex-1 overflow-y-auto p-6 relative">
                
                {/* GRID LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredList.map(entity => {
                        const stats = getFinancials(entity.id);
                        return (
                            <EntityCard 
                                key={entity.id} 
                                entity={entity} 
                                stats={stats} 
                                onPay={() => setFinAction({ entityId: entity.id, type: 'PAY', name: entity.name })}
                                onInvoice={() => setFinAction({ entityId: entity.id, type: 'INVOICE', name: entity.name })}
                                onUpdate={onUpdate}
                            />
                        );
                    })}
                    {filteredList.length === 0 && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-600 opacity-50">
                            <Search size={32} strokeWidth={1} className="mb-2"/>
                            <div className="text-sm font-mono">NO RECORDS FOUND</div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- ADD ENTITY MODAL --- */}
            {isModalOpen && (
                <AddEntityModal 
                    initialContext={context}
                    onClose={() => setIsModalOpen(false)}
                    onSave={(client) => {
                        onAdd(client);
                        setIsModalOpen(false);
                    }}
                />
            )}

            {/* --- FINANCIAL ACTION MODAL --- */}
            {finAction && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-sm shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-full ${finAction.type === 'PAY' ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-950 text-emerald-500'}`}>
                                {finAction.type === 'PAY' ? <ArrowUpRight size={18}/> : <ArrowDownLeft size={18}/>}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-200">{finAction.type === 'PAY' ? 'Log Expense' : 'Log Invoice'}</h3>
                                <p className="text-xs text-zinc-500 font-mono">{finAction.name}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-mono text-zinc-600 mb-1 block">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                                    <input 
                                        type="number" 
                                        value={finAmount} 
                                        onChange={e => setFinAmount(e.target.value)} 
                                        className="w-full bg-black border border-zinc-800 rounded px-3 py-2 pl-6 text-white font-mono focus:border-emerald-500 outline-none"
                                        autoFocus
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setFinAction(null)} className="flex-1 py-2 bg-transparent border border-zinc-800 text-zinc-400 text-xs rounded hover:bg-zinc-800">CANCEL</button>
                                <button onClick={handleFinancialSubmit} className="flex-1 py-2 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200">CONFIRM</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENTS ---

const TabItem = ({ active, onClick, label, icon }: any) => (
    <button 
        onClick={onClick}
        className={`
            group flex items-center gap-2 py-4 border-b-2 transition-all text-xs font-bold tracking-wider
            ${active 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-zinc-600 hover:text-zinc-400 hover:border-zinc-800'}
        `}
    >
        {icon}
        {label}
    </button>
);

// --- SMART ENTRY MODAL ---

const AddEntityModal: React.FC<{ 
    initialContext: EntityContext, 
    onClose: () => void, 
    onSave: (c: Client) => void 
}> = ({ initialContext, onClose, onSave }) => {
    
    const [context, setContext] = useState<EntityContext>(initialContext);
    const [type, setType] = useState<EntityType>('TEAM');
    const [circle, setCircle] = useState<PersonalCircle>('NONE');
    
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [company, setCompany] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    
    const [status, setStatus] = useState('ACTIVE');
    const [rate, setRate] = useState('');
    const [rateType, setRateType] = useState<'HOURLY'|'MONTHLY'|'FIXED'>('HOURLY');

    // Suggestions based on Context
    const tagSuggestions = context === 'NEMO' 
        ? ['Frontend', 'Backend', 'Design', 'Marketing', 'Lead', 'Contractor']
        : ['Family', 'Friend', 'Mentor', 'Peer', 'Uni', 'Gym'];

    const handleAddTag = (t: string) => {
        if(!tags.includes(t)) setTags([...tags, t]);
        setTagInput('');
    }

    const handleSave = () => {
        if(!name) return;
        
        const finalType = context === 'PERSONAL' ? 'NETWORK' : type;

        onSave({
            id: generateId(),
            name,
            role,
            company,
            context,
            type: finalType,
            status,
            tags,
            circle: context === 'PERSONAL' ? circle : undefined,
            rate: parseFloat(rate) || 0,
            rateType: context === 'NEMO' ? rateType : 'NONE',
            currency: 'USD',
            lastInteraction: Date.now(),
            nextAction: 'Initial Setup'
        });
    };

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4">
            <div className="bg-surface border border-border w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* HEADER */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        <Plus size={18} className="text-emerald-500" /> New Network Entry
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                </div>

                {/* BODY */}
                <div className="overflow-y-auto p-6 space-y-8">
                    
                    {/* 1. CONTEXT SELECTOR */}
                    <div>
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 block">Context & Category</label>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <button 
                                onClick={() => setContext('NEMO')}
                                className={`p-4 border rounded text-left transition-all ${context === 'NEMO' ? 'bg-zinc-800 border-zinc-600' : 'bg-transparent border-zinc-800 hover:border-zinc-700'}`}
                            >
                                <div className="flex items-center gap-2 mb-1 text-sm font-bold text-zinc-200"><Building2 size={16}/> Agency (Nemo)</div>
                                <div className="text-xs text-zinc-500">Clients, Team, Recruits</div>
                            </button>
                            <button 
                                onClick={() => setContext('PERSONAL')}
                                className={`p-4 border rounded text-left transition-all ${context === 'PERSONAL' ? 'bg-zinc-800 border-zinc-600' : 'bg-transparent border-zinc-800 hover:border-zinc-700'}`}
                            >
                                <div className="flex items-center gap-2 mb-1 text-sm font-bold text-zinc-200"><User size={16}/> Personal</div>
                                <div className="text-xs text-zinc-500">Friends, Family, Mentors</div>
                            </button>
                        </div>
                        
                        {/* Sub-Selection based on Context */}
                        {context === 'NEMO' ? (
                            <div className="flex gap-2">
                                <SelectPill active={type === 'TEAM'} onClick={() => setType('TEAM')} label="Team Member" icon={<Users size={14}/>} />
                                <SelectPill active={type === 'CANDIDATE'} onClick={() => setType('CANDIDATE')} label="Candidate" icon={<Star size={14}/>} />
                                <SelectPill active={type === 'CLIENT'} onClick={() => setType('CLIENT')} label="Client" icon={<Briefcase size={14}/>} />
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <SelectPill active={circle === 'INNER'} onClick={() => setCircle('INNER')} label="Inner Circle" icon={<Heart size={14}/>} />
                                <SelectPill active={circle === 'OUTER'} onClick={() => setCircle('OUTER')} label="Outer Circle" icon={<Users size={14}/>} />
                                <SelectPill active={circle === 'PROFESSIONAL'} onClick={() => setCircle('PROFESSIONAL')} label="Professional" icon={<Briefcase size={14}/>} />
                            </div>
                        )}
                    </div>

                    {/* 2. DETAILS INPUTS */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Identity Details</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full bg-black border border-zinc-800 rounded px-4 py-3 text-zinc-200 focus:border-emerald-500 outline-none"/>
                            </div>
                            <input value={role} onChange={e => setRole(e.target.value)} placeholder={context === 'NEMO' ? "Role (e.g. Dev)" : "Relation (e.g. Uncle)"} className="bg-black border border-zinc-800 rounded px-4 py-3 text-zinc-200 focus:border-zinc-600 outline-none text-sm"/>
                            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Organization / Location" className="bg-black border border-zinc-800 rounded px-4 py-3 text-zinc-200 focus:border-zinc-600 outline-none text-sm"/>
                        </div>
                    </div>

                    {/* 3. TAGS & STATUS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block">Tags & Keywords</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {tags.map(t => (
                                    <span key={t} className="px-2 py-1 rounded bg-zinc-800 text-[10px] text-zinc-300 flex items-center gap-1 border border-zinc-700">
                                        <Hash size={10}/> {t} <button onClick={() => setTags(tags.filter(tag => tag !== t))}><X size={10}/></button>
                                    </span>
                                ))}
                            </div>
                            <div className="relative mb-3">
                                <input 
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTag(tagInput)}
                                    placeholder="Add custom tag..."
                                    className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 outline-none"
                                />
                                <button onClick={() => handleAddTag(tagInput)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><Plus size={14}/></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {tagSuggestions.map(t => (
                                    <button key={t} onClick={() => handleAddTag(t)} className="px-2 py-1 rounded border border-zinc-800 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
                                        + {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block">Status & Stage</label>
                            <div className="flex flex-col gap-2">
                                {['ACTIVE', 'LEAD', 'INTERVIEWING', 'WARM', 'COLD'].map(s => (
                                    <button 
                                        key={s} 
                                        onClick={() => setStatus(s)}
                                        className={`flex items-center justify-between px-3 py-2 rounded text-xs border ${status === s ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-zinc-800 text-zinc-500 hover:bg-zinc-900'}`}
                                    >
                                        <span>{s}</span>
                                        {status === s && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-6 border-t border-border flex justify-end gap-3 bg-zinc-900/30">
                    <button onClick={onClose} className="px-6 py-2 rounded border border-zinc-800 text-zinc-400 text-xs hover:text-white hover:bg-zinc-800">CANCEL</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded bg-white text-black text-xs font-bold hover:bg-zinc-200">SAVE PROFILE</button>
                </div>
            </div>
        </div>
    );
};

const SelectPill = ({ active, onClick, label, icon }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-all flex-1 justify-center ${active ? 'bg-zinc-100 text-black border-white' : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
    >
        {icon} {label}
    </button>
);

const EntityCard: React.FC<{ 
    entity: Client;
    stats: { total: number; count: number };
    onPay: () => void;
    onInvoice: () => void;
    onUpdate: (id: string, update: Partial<Client>) => void;
}> = ({ entity, stats, onPay, onInvoice, onUpdate }) => {
    
    // Status Colors
    const getStatusColor = (s: string) => {
        const map: any = {
            'ACTIVE': 'text-emerald-400 border-emerald-900/30 bg-emerald-950/10',
            'LEAD': 'text-blue-400 border-blue-900/30 bg-blue-950/10',
            'INTERVIEWING': 'text-amber-400 border-amber-900/30 bg-amber-950/10',
            'SIGNED': 'text-purple-400 border-purple-900/30 bg-purple-950/10',
            'WARM': 'text-orange-400 border-orange-900/30 bg-orange-950/10'
        };
        return map[s] || 'text-zinc-500 border-zinc-800 bg-zinc-900';
    };

    return (
        <div className="bg-surface border border-border rounded-lg p-4 hover:border-zinc-600 transition-colors flex flex-col justify-between group h-full relative overflow-hidden">
            {/* Context Badge */}
            <div className={`absolute top-0 right-0 px-2 py-0.5 rounded-bl text-[9px] font-mono uppercase ${entity.context === 'NEMO' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-900 text-zinc-600'}`}>
                {entity.context === 'PERSONAL' && entity.circle ? entity.circle : entity.type}
            </div>

            <div>
                <div className="flex justify-between items-start mb-3 mt-1">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded flex items-center justify-center text-sm font-bold border ${entity.context === 'NEMO' ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                            {entity.name.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-200">{entity.name}</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-zinc-500 font-mono uppercase">{entity.role}</p>
                                <span className={`px-1.5 py-0 rounded-[2px] text-[8px] font-mono border uppercase ${getStatusColor(entity.status)}`}>
                                    {entity.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 mb-4">
                    {/* INFO ROW */}
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Briefcase size={12}/>
                        <span>{entity.company}</span>
                    </div>

                    {/* TAGS */}
                    {entity.tags && entity.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {entity.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[9px] text-zinc-400">#{tag}</span>
                            ))}
                            {entity.tags.length > 3 && <span className="text-[9px] text-zinc-600">+{entity.tags.length - 3}</span>}
                        </div>
                    )}

                    {/* FINANCIALS ROW (Only Agency) */}
                    {entity.context === 'NEMO' && (
                         <div className="p-2 bg-zinc-900/50 rounded border border-zinc-800/50 flex items-center justify-between mt-2">
                             <div className="flex flex-col">
                                 <span className="text-[9px] text-zinc-600 font-mono uppercase">
                                     {entity.type === 'CLIENT' ? 'Deal Value' : 'Rate'}
                                 </span>
                                 <span className="text-xs font-mono text-zinc-300">
                                     ${entity.rate.toLocaleString()}<span className="text-zinc-600 text-[9px]">{entity.rateType !== 'FIXED' && entity.rateType !== 'NONE' ? `/${entity.rateType === 'HOURLY' ? 'hr' : 'mo'}` : ''}</span>
                                 </span>
                             </div>
                             <div className="h-6 w-px bg-zinc-800"></div>
                             <div className="flex flex-col items-end">
                                 <span className="text-[9px] text-zinc-600 font-mono uppercase">
                                     {entity.type === 'CLIENT' ? 'Billed' : 'Paid'}
                                 </span>
                                 <span className={`text-xs font-mono ${stats.total > 0 ? (entity.type === 'CLIENT' ? 'text-emerald-500' : 'text-zinc-400') : 'text-zinc-600'}`}>
                                     ${stats.total.toLocaleString()}
                                 </span>
                             </div>
                         </div>
                    )}
                </div>
            </div>

            {/* ACTIONS FOOTER */}
            <div className="pt-3 border-t border-zinc-800/50 flex gap-2 mt-auto">
                {entity.context === 'NEMO' && (entity.type === 'TEAM' || entity.type === 'CANDIDATE') && (
                    <button onClick={onPay} className="flex-1 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1">
                        <Wallet size={10}/> PAY
                    </button>
                )}
                {entity.context === 'NEMO' && entity.type === 'CLIENT' && (
                    <button onClick={onInvoice} className="flex-1 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-emerald-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1">
                        <DollarSign size={10}/> INVOICE
                    </button>
                )}
                 {entity.context === 'PERSONAL' && (
                    <button className="flex-1 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1">
                        <Coffee size={10}/> CATCH UP
                    </button>
                )}
            </div>
        </div>
    );
}

export default NetworkView;
