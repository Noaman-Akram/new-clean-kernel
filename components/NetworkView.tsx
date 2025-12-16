import React, { useState, useMemo, useEffect } from 'react';
import { AppState, Client, EntityContext, EntityType, Transaction, Category, PersonalCircle } from '../types';
import { generateId } from '../utils';
import {
    Plus,
    Building2,
    User as UserIcon,
    Search,
    Filter,
    Clock3,
    CalendarClock,
    Check,
    NotebookPen,
    DollarSign,
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    X,
    Hash,
    Heart,
    Users,
    Briefcase,
    Star,
    Coffee,
    Handshake,
    LayoutGrid,
    List as ListIcon,
    Edit3,
    Rows
} from 'lucide-react';

interface Props {
  state: AppState;
  onUpdate: (id: string, updates: Partial<Client>) => void;
  onAdd: (client: Client) => void;
  onAddTransaction: (tx: Transaction) => void;
}

const statusFilters = ['ALL', 'ACTIVE', 'PAUSED', 'OFFBOARDING', 'LEAD', 'INTERVIEWING', 'SOURCED', 'HOLD', 'WARM', 'COLD'];
const circleLabels: Record<PersonalCircle, string> = {
    FRIEND: 'Friend',
    FAMILY: 'Family',
    MENTOR: 'Mentor',
    ALLY: 'High-Value Ally',
    NONE: 'Unsorted'
};

const followUpThreshold = {
    NEMO: 1000 * 60 * 60 * 24 * 3, // 3 days
    PERSONAL: 1000 * 60 * 60 * 24 * 7 // 7 days
};

const teamRoleOptions = [
    'Frontend Engineer',
    'Backend Engineer',
    'Full-stack',
    'Product Designer',
    'Product Manager',
    'Data Engineer',
    'Operations',
    'Marketing',
    'Growth',
    'Sales',
    'Success',
    'Biz Ops',
    'QA',
    'Copywriter',
    'Video'
];
const teamStatusOptions = ['ACTIVE', 'PAUSED', 'OFFBOARDING'];
const candidateStatusOptions = ['SOURCED', 'INTERVIEWING', 'HOLD'];
const clientStageOptions: Array<Client['stage']> = ['LEAD', 'DISCOVERY', 'PROPOSAL', 'CLOSED', 'LOST'];
const partnerFocusOptions = ['Development', 'Design', 'Marketing', 'Automation'];
const personalRelationOptions: PersonalCircle[] = ['FRIEND', 'FAMILY', 'MENTOR', 'ALLY'];
const personalCategoryLabels: Record<PersonalCircle, string> = {
    FRIEND: 'Friend',
    FAMILY: 'Family',
    MENTOR: 'Mentor',
    ALLY: 'High value'
};

const NetworkView: React.FC<Props> = ({ state, onUpdate, onAdd, onAddTransaction }) => {
    const [context, setContext] = useState<EntityContext>('NEMO');
    const [activeTab, setActiveTab] = useState<EntityType>('TEAM');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [finAction, setFinAction] = useState<{ entityId: string, type: 'PAY' | 'INVOICE', name: string } | null>(null);
    const [finAmount, setFinAmount] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [clientView, setClientView] = useState<'LIST' | 'BOARD' | 'CARDS'>('LIST');
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    const isClientContext = context === 'NEMO' && activeTab === 'CLIENT';

    const filteredList = useMemo(() => {
        const base = state.clients.filter(c => {
            if (c.context !== context) return false;
            if (context === 'NEMO') {
                return c.type === activeTab;
            }
            return true;
        });

        return base.filter(c => {
            if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
            if (!searchTerm.trim()) return true;
            const search = searchTerm.toLowerCase();
            return (
                (c.name || '').toLowerCase().includes(search) ||
                (c.role || '').toLowerCase().includes(search) ||
                (c.company || '').toLowerCase().includes(search) ||
                (c.tags || []).some(tag => tag.toLowerCase().includes(search))
            );
        });
    }, [state.clients, context, activeTab, statusFilter, searchTerm]);

    const overdueCount = useMemo(() => filteredList.filter(needsFollowUp).length, [filteredList]);

    const totalContextCount = useMemo(() => state.clients.filter(c => c.context === context).length, [state.clients, context]);

    useEffect(() => {
        if (!isClientContext) {
            setClientView('LIST');
        }
    }, [isClientContext]);

    const clientStageGroups = useMemo(() => {
        if (!isClientContext) return null;
        const groups: Record<Client['stage'], Client[]> = {
            LEAD: [],
            DISCOVERY: [],
            PROPOSAL: [],
            CLOSED: [],
            LOST: []
        };
        filteredList.forEach(entity => {
            const stage = entity.stage || 'LEAD';
            groups[stage].push(entity);
        });
        return groups;
    }, [filteredList, isClientContext]);

    const handleQuickAdd = (entry: Client) => {
        onAdd(entry);
    };

    const handleLogTouch = (id: string) => {
        onUpdate(id, { lastInteraction: Date.now() });
    };

    const handleSetNextAction = (entity: Client) => {
        const next = window.prompt('Next step for this contact', entity.nextAction || '');
        if (next !== null) {
            const cleaned = next.trim();
            if (cleaned.length > 0) {
                onUpdate(entity.id, { nextAction: cleaned });
            }
        }
    };

    const handleClientStageChange = (entityId: string, stage: Client['stage']) => {
        onUpdate(entityId, { stage });
    };

    const handleClientQuickEdit = (entity: Client) => {
        const next = window.prompt('Update notes or needs', entity.needs || entity.nextAction || '');
        if (next !== null) {
            onUpdate(entity.id, { needs: next, nextAction: next });
        }
    };

    const getFinancials = (entityId: string) => {
        const txs = state.transactions.filter(t => t.relatedEntityId === entityId);
        const total = txs.reduce((sum, t) => sum + t.amount, 0);
        return { total, count: txs.length };
    };

    const handleFinancialSubmit = () => {
        if(!finAction || !finAmount) return;
        const amount = parseFloat(finAmount);
        if(!amount) return;

        const isPay = finAction.type === 'PAY';
        const category = context === 'NEMO' ? Category.AGENCY : Category.FREELANCE;

        onAddTransaction({
            id: generateId(),
            amount,
            date: Date.now(),
            description: `${isPay ? 'Payment to' : 'Invoice from'} ${finAction.name}`,
            type: isPay ? 'EXPENSE' : 'INCOME',
            category,
            relatedEntityId: finAction.entityId
        });

        setFinAction(null);
        setFinAmount('');
    };

    return (
        <div className="h-full flex flex-col animate-fade-in bg-background relative">
            <div className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-20">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => { setContext('NEMO'); setActiveTab('TEAM'); setStatusFilter('ALL'); }}
                        className={`flex items-center gap-2 text-sm font-bold tracking-wide transition-colors ${context === 'NEMO' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        <Building2 size={16} /> NEMO (Agency)
                    </button>
                    <div className="h-4 w-px bg-zinc-800"></div>
                    <button 
                        onClick={() => { setContext('PERSONAL'); setActiveTab('NETWORK'); setStatusFilter('ALL'); }}
                        className={`flex items-center gap-2 text-sm font-bold tracking-wide transition-colors ${context === 'PERSONAL' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        <UserIcon size={16} /> Personal Circle
                    </button>
                </div>

                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-black rounded-md text-xs font-bold hover:bg-zinc-200 transition-colors"
                >
                    <Plus size={14} />
                    <span>Detailed Entry</span>
                </button>
            </div>

            {context === 'NEMO' && (
                <div className="px-6 border-b border-border bg-background/50 backdrop-blur-sm flex gap-6">
                    <TabItem active={activeTab === 'TEAM'} onClick={() => setActiveTab('TEAM')} label="Team & Ops" icon={<Users size={14}/>} />
                    <TabItem active={activeTab === 'CANDIDATE'} onClick={() => setActiveTab('CANDIDATE')} label="Talent Bench" icon={<Star size={14}/>} />
                    <TabItem active={activeTab === 'CLIENT'} onClick={() => setActiveTab('CLIENT')} label="Clients & Deals" icon={<Briefcase size={14}/>} />
                    <TabItem active={activeTab === 'PARTNER'} onClick={() => setActiveTab('PARTNER')} label="Partners" icon={<Handshake size={14}/>} />
                </div>
            )}

            <div className="border-b border-border bg-background/70 px-6 py-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
                        Quick Log
                    </div>
                    <button
                        onClick={() => setShowQuickAdd(prev => !prev)}
                        className="text-xs font-semibold px-3 py-1.5 border border-zinc-700 rounded-md text-zinc-200 hover:text-white hover:border-zinc-500 transition-colors"
                    >
                        {showQuickAdd ? 'Hide form' : 'Capture entry'}
                    </button>
                </div>
                {showQuickAdd && (
                    <div className="max-h-72 overflow-y-auto pr-1">
                        <QuickAddPanel 
                            context={context} 
                            activeTab={activeTab} 
                            onQuickAdd={handleQuickAdd}
                        />
                    </div>
                )}
            </div>

            <div className="border-b border-border bg-background/70 px-6 py-3 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <div className="relative w-full">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                        <input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search name, tag, company..."
                            className="w-full bg-black border border-zinc-800 rounded-md py-2 pl-10 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 outline-none"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Filter size={12} />
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-black border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 focus:border-zinc-500 outline-none"
                    >
                        {statusFilters.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500">
                    <span>{filteredList.length} VISIBLE</span>
                    <span className={overdueCount > 0 ? 'text-amber-400' : ''}>{overdueCount} NEED TOUCH</span>
                    <span className="text-zinc-600">{totalContextCount} TOTAL</span>
                </div>
                {isClientContext && (
                    <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                        <button
                            type="button"
                            onClick={() => setClientView('LIST')}
                            className={`px-2.5 py-1.5 border rounded flex items-center gap-1 ${clientView === 'LIST' ? 'border-white text-white' : 'border-zinc-800 text-zinc-500'}`}
                        >
                            <ListIcon size={12} /> Table
                        </button>
                        <button
                            type="button"
                            onClick={() => setClientView('BOARD')}
                            className={`px-2.5 py-1.5 border rounded flex items-center gap-1 ${clientView === 'BOARD' ? 'border-white text-white' : 'border-zinc-800 text-zinc-500'}`}
                        >
                            <LayoutGrid size={12} /> Kanban
                        </button>
                        <button
                            type="button"
                            onClick={() => setClientView('CARDS')}
                            className={`px-2.5 py-1.5 border rounded flex items-center gap-1 ${clientView === 'CARDS' ? 'border-white text-white' : 'border-zinc-800 text-zinc-500'}`}
                        >
                            <Rows size={12} /> Cards
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {isClientContext && clientView === 'BOARD' && clientStageGroups ? (
                    <ClientBoard 
                        groups={clientStageGroups}
                        onStageChange={handleClientStageChange}
                        onEdit={handleClientQuickEdit}
                    />
                ) : isClientContext && clientView === 'CARDS' ? (
                    <ClientCardGrid 
                        entities={filteredList}
                        onStageChange={handleClientStageChange}
                        onUpdate={onUpdate}
                    />
                ) : filteredList.length > 0 ? (
                    <div className="space-y-2">
                        {filteredList.map(entity => (
                            <EntityRow 
                                key={entity.id}
                                entity={entity}
                                stats={entity.context === 'PERSONAL' ? { total: 0, count: 0 } : getFinancials(entity.id)}
                                onLogTouch={() => handleLogTouch(entity.id)}
                                onNextAction={() => handleSetNextAction(entity)}
                                onInvoice={entity.context === 'NEMO' && entity.type === 'CLIENT' ? () => setFinAction({ entityId: entity.id, type: 'INVOICE', name: entity.name }) : undefined}
                                onPay={entity.context === 'NEMO' && entity.type !== 'CLIENT' ? () => setFinAction({ entityId: entity.id, type: 'PAY', name: entity.name }) : undefined}
                                needsAttention={needsFollowUp(entity)}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState label={context === 'PERSONAL' ? 'Personal circle empty' : 'No records in this view'} />
                )}
            </div>

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

type QuickFormState = {
    name: string;
    role: string;
    customRole: string;
    status: string;
    stage: Client['stage'];
    rate: string;
    company: string;
    needs: string;
    note: string;
    focusArea: string;
    contactHandle: string;
    profileUrl: string;
    followUp: string;
    dealValue: string;
    personalTags: PersonalCircle[];
};

const createInitialQuickState = (context: EntityContext, tab: EntityType): QuickFormState => ({
    name: '',
    role: '',
    customRole: '',
    status: context === 'PERSONAL'
        ? 'WARM'
        : tab === 'CANDIDATE'
            ? 'SOURCED'
            : tab === 'CLIENT'
                ? 'LEAD'
                : 'ACTIVE',
    stage: 'LEAD',
    rate: '',
    company: '',
    needs: '',
    note: '',
    focusArea: '',
    contactHandle: '',
    profileUrl: '',
    followUp: '',
    dealValue: '',
    personalTags: []
});

const QuickAddPanel: React.FC<{ context: EntityContext; activeTab: EntityType; onQuickAdd: (client: Client) => void; }> = ({ context, activeTab, onQuickAdd }) => {
    const initialState = useMemo(() => createInitialQuickState(context, activeTab), [context, activeTab]);
    const [form, setForm] = useState<QuickFormState>(initialState);

    useEffect(() => {
        setForm(initialState);
    }, [initialState]);

    const update = (key: keyof QuickFormState, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const togglePersonalTag = (tag: PersonalCircle) => {
        setForm(prev => {
            const exists = prev.personalTags.includes(tag);
            const tags = exists ? prev.personalTags.filter(t => t !== tag) : [...prev.personalTags, tag];
            return { ...prev, personalTags: tags };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        if (context === 'PERSONAL') {
            const primary = form.personalTags[0] || 'NONE';
            onQuickAdd({
                id: generateId(),
                name: form.name.trim(),
                role: primary === 'NONE' ? 'Contact' : circleLabels[primary],
                company: '',
                context: 'PERSONAL',
                type: 'NETWORK',
                status: form.status,
                tags: form.personalTags,
                circle: primary,
                rate: 0,
                rateType: 'NONE',
                currency: 'USD',
                lastInteraction: Date.now(),
                nextAction: form.note || 'Stay in touch',
                contactHandle: form.contactHandle || undefined
            });
            setForm(initialState);
            return;
        }

        const companyName = (activeTab === 'CLIENT' || activeTab === 'PARTNER')
            ? form.company.trim()
            : 'Nemo';
        const rateValue = activeTab === 'CLIENT'
            ? parseFloat(form.dealValue) || 0
            : parseFloat(form.rate) || 0;

        const base: Client = {
            id: generateId(),
            name: form.name.trim(),
            role: '',
            company: companyName,
            context: 'NEMO',
            type: activeTab,
            status: form.status,
            tags: [],
            rate: rateValue,
            rateType: activeTab === 'CLIENT' ? 'FIXED' : activeTab === 'TEAM' ? 'MONTHLY' : 'HOURLY',
            currency: 'USD',
            lastInteraction: Date.now(),
            nextAction: form.followUp || 'Follow up',
            profileUrl: form.profileUrl || undefined,
            contactHandle: form.contactHandle || undefined,
            needs: activeTab === 'CLIENT' ? form.needs || undefined : undefined,
            stage: activeTab === 'CLIENT' ? form.stage : undefined,
            focusArea: activeTab === 'PARTNER' ? form.focusArea || undefined : undefined
        };

        if (activeTab === 'TEAM') {
            base.role = form.role === 'custom' ? form.customRole : form.role || 'Contributor';
        } else if (activeTab === 'CANDIDATE') {
            base.role = form.role || 'Candidate';
        } else if (activeTab === 'CLIENT') {
            base.role = form.role || 'Client';
        } else if (activeTab === 'PARTNER') {
            base.role = 'Partner';
            base.rate = 0;
            base.rateType = 'NONE';
        }

        onQuickAdd(base);
        setForm(initialState);
    };

    const renderTeamFields = () => (
        <>
            <InputField label="Name" value={form.name} onChange={v => update('name', v)} placeholder="Team member name" />
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-zinc-500 uppercase">Role</label>
                <select
                    value={form.role}
                    onChange={e => update('role', e.target.value)}
                    className="bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
                >
                    <option value="">Select role</option>
                    {teamRoleOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                    <option value="custom">Other</option>
                </select>
                {form.role === 'custom' && (
                    <input
                        value={form.customRole}
                        onChange={e => update('customRole', e.target.value)}
                        className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
                        placeholder="Title"
                    />
                )}
            </div>
            <SelectField label="Status" value={form.status} options={teamStatusOptions} onChange={v => update('status', v)} />
            <InputField label="Monthly rate" value={form.rate} onChange={v => update('rate', v)} placeholder="USD" type="number" />
            <InputField label="Contact" value={form.contactHandle} onChange={v => update('contactHandle', v)} placeholder="@handle or email" />
        </>
    );

    const renderCandidateFields = () => (
        <>
            <InputField label="Name" value={form.name} onChange={v => update('name', v)} placeholder="Candidate name" />
            <InputField label="Specialty" value={form.role} onChange={v => update('role', v)} placeholder="React Native · Shopify · etc." />
            <SelectField label="Status" value={form.status} options={candidateStatusOptions} onChange={v => update('status', v)} />
            <InputField label="Hourly rate" value={form.rate} onChange={v => update('rate', v)} placeholder="USD" type="number" />
            <InputField label="Profile URL" value={form.profileUrl} onChange={v => update('profileUrl', v)} placeholder="Portfolio link" />
            <InputField label="Contact" value={form.contactHandle} onChange={v => update('contactHandle', v)} placeholder="@telegram / email" />
        </>
    );

    const renderClientFields = () => (
        <>
            <InputField label="Company / Project" value={form.company} onChange={v => update('company', v)} placeholder="Client org" />
            <InputField label="Contact name" value={form.name} onChange={v => update('name', v)} placeholder="Primary contact" />
            <SelectField label="Stage" value={form.stage} options={clientStageOptions} onChange={v => update('stage', v as Client['stage'])} />
            <InputField label="Deal value" value={form.dealValue} onChange={v => update('dealValue', v)} placeholder="USD" type="number" />
            <InputField label="Needs / Scope" value={form.needs} onChange={v => update('needs', v)} placeholder="What they asked for" />
            <InputField label="Next follow-up" value={form.followUp} onChange={v => update('followUp', v)} placeholder="E.g. Demo Tuesday" />
        </>
    );

    const renderPartnerFields = () => (
        <>
            <InputField label="Partner name" value={form.company} onChange={v => update('company', v)} placeholder="Studio / vendor" />
            <InputField label="Contact" value={form.name} onChange={v => update('name', v)} placeholder="Point of contact" />
            <SelectField label="Focus" value={form.focusArea} options={partnerFocusOptions} onChange={v => update('focusArea', v)} />
            <InputField label="Handle / Email" value={form.contactHandle} onChange={v => update('contactHandle', v)} placeholder="@whatsapp / mail" />
        </>
    );

    const renderPersonalFields = () => (
        <>
            <InputField label="Name" value={form.name} onChange={v => update('name', v)} placeholder="Friend / mentor" />
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-zinc-500 uppercase">Categories</label>
                <div className="flex flex-wrap gap-2">
                    {personalRelationOptions.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => togglePersonalTag(tag)}
                            className={`px-2 py-1 border rounded text-[11px] ${form.personalTags.includes(tag) ? 'border-white text-white' : 'border-zinc-800 text-zinc-500'}`}
                        >
                            {personalCategoryLabels[tag]}
                        </button>
                    ))}
                </div>
            </div>
            <InputField label="Reminder / Note" value={form.note} onChange={v => update('note', v)} placeholder="Check-in monthly" />
            <InputField label="Contact" value={form.contactHandle} onChange={v => update('contactHandle', v)} placeholder="@ig / phone" />
        </>
    );

    const renderFields = () => {
        if (context === 'PERSONAL') return renderPersonalFields();
        switch (activeTab) {
            case 'TEAM':
                return renderTeamFields();
            case 'CANDIDATE':
                return renderCandidateFields();
            case 'CLIENT':
                return renderClientFields();
            case 'PARTNER':
                return renderPartnerFields();
            default:
                return null;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="grid md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                {renderFields()}
            </div>
            <button type="submit" className="w-full md:w-auto px-4 py-3 bg-white text-black text-xs font-semibold rounded hover:bg-zinc-100">
                Log
            </button>
        </form>
    );
};

const InputField = ({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-mono text-zinc-500 uppercase">{label}</label>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
        />
    </div>
);

const SelectField = ({ label, value, options, onChange }: { label: string; value: string; options: Array<string | undefined>; onChange: (v: string) => void }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] font-mono text-zinc-500 uppercase">{label}</label>
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
        >
            <option value="">Select</option>
            {options.filter(Boolean).map(option => (
                <option key={option as string} value={option as string}>{option}</option>
            ))}
        </select>
    </div>
);

const EntityRow: React.FC<{
    entity: Client;
    stats: { total: number; count: number };
    onLogTouch: () => void;
    onNextAction: () => void;
    onInvoice?: () => void;
    onPay?: () => void;
    needsAttention: boolean;
}> = ({ entity, stats, onLogTouch, onNextAction, onInvoice, onPay, needsAttention }) => {
    const daysSince = formatDaysSince(entity.lastInteraction);
    const descriptor = (() => {
        if (entity.context === 'PERSONAL') {
            if (entity.tags && entity.tags.length > 0) {
                return entity.tags
                    .map(tag => personalCategoryLabels[tag as PersonalCircle] || tag)
                    .join(' · ');
            }
            return 'Personal Contact';
        }
        if (entity.type === 'CLIENT') {
            return entity.company || 'Prospect';
        }
        if (entity.type === 'PARTNER') {
            return entity.company || 'Partner';
        }
        return entity.role || 'Contributor';
    })();
    const detailLine = (() => {
        if (entity.context === 'PERSONAL') {
            return entity.contactHandle || entity.nextAction;
        }
        if (entity.type === 'CLIENT') {
            return entity.needs || entity.contactHandle;
        }
        if (entity.type === 'PARTNER') {
            return entity.focusArea || entity.contactHandle;
        }
        return entity.contactHandle || entity.focusArea;
    })();

    return (
        <div className="bg-surface border border-border rounded-lg px-4 py-3 shadow-sm shadow-black/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[180px]">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{entity.name}</span>
                        {entity.type === 'CLIENT' && <StageBadge stage={entity.stage} />}
                        <StatusBadge status={entity.status} />
                    </div>
                    <div className="text-[11px] text-zinc-500">{descriptor}</div>
                    {detailLine && <div className="text-[11px] text-zinc-600">{detailLine}</div>}
                </div>
                <div className="flex flex-col items-end text-right text-[11px] text-zinc-500">
                    <span className={needsAttention ? 'text-amber-400 font-semibold' : 'text-zinc-400'}>{daysSince}</span>
                    <span className="uppercase font-mono text-[10px]">Last touch</span>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs text-zinc-400">
                <div className="flex flex-col gap-1 min-w-[200px]">
                    {entity.nextAction && (
                        <div className="flex items-center gap-2">
                            <CalendarClock size={12} />
                            <span className="text-zinc-300">{entity.nextAction}</span>
                        </div>
                    )}
                    {entity.tags && entity.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {entity.tags.slice(0, entity.context === 'PERSONAL' ? 6 : 4).map(tag => (
                                <span 
                                    key={tag} 
                                    className={`px-1.5 py-0.5 rounded text-[9px] ${entity.context === 'PERSONAL' ? 'bg-emerald-950/20 border border-emerald-900/30 text-emerald-300' : 'bg-black border border-zinc-800 text-zinc-400'}`}
                                >
                                    {entity.context === 'PERSONAL' 
                                        ? personalCategoryLabels[tag as PersonalCircle] || tag 
                                        : `#${tag}`}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {entity.context === 'NEMO' && (
                    <div className="flex items-center gap-6 text-[11px] font-mono">
                        <div>
                            <div className="text-zinc-500 uppercase">Value</div>
                            <div className="text-zinc-200">${entity.rate || 0}{entity.rateType !== 'NONE' ? `/${entity.rateType === 'HOURLY' ? 'hr' : entity.rateType === 'MONTHLY' ? 'mo' : ''}` : ''}</div>
                        </div>
                        <div>
                            <div className="text-zinc-500 uppercase">{entity.type === 'CLIENT' ? 'Billed' : 'Paid'}</div>
                            <div className="text-emerald-400">${stats.total.toLocaleString()}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
                <button 
                    onClick={onLogTouch}
                    className="px-3 py-1.5 text-[10px] font-mono rounded border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white flex items-center gap-1"
                >
                    <Check size={12} /> Check-in
                </button>
                <button 
                    onClick={onNextAction}
                    className="px-3 py-1.5 text-[10px] font-mono rounded border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white flex items-center gap-1"
                >
                    <NotebookPen size={12} /> Next Step
                </button>
                {entity.context === 'NEMO' && entity.type === 'CLIENT' && onInvoice && (
                    <button 
                        onClick={onInvoice}
                        className="px-3 py-1.5 text-[10px] font-mono rounded border border-emerald-700 text-emerald-400 hover:bg-emerald-900/20 flex items-center gap-1"
                    >
                        <DollarSign size={12} /> Invoice
                    </button>
                )}
                {entity.context === 'NEMO' && (entity.type === 'TEAM' || entity.type === 'CANDIDATE') && onPay && (
                    <button 
                        onClick={onPay}
                        className="px-3 py-1.5 text-[10px] font-mono rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-900/40 flex items-center gap-1"
                    >
                        <Wallet size={12} /> Pay
                    </button>
                )}
                {entity.context === 'NEMO' && entity.type === 'PARTNER' && (
                    <button 
                        onClick={onNextAction}
                        className="px-3 py-1.5 text-[10px] font-mono rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-900/40 flex items-center gap-1"
                    >
                        <NotebookPen size={12} /> Sync
                    </button>
                )}
                {entity.context === 'PERSONAL' && (
                    <button 
                        onClick={onLogTouch}
                        className="px-3 py-1.5 text-[10px] font-mono rounded border border-zinc-800 text-zinc-300 hover:bg-zinc-900/40 flex items-center gap-1"
                    >
                        <Coffee size={12} /> Ping
                    </button>
                )}
            </div>
        </div>
    );
};

const ClientBoard = ({ groups, onStageChange, onEdit }: { groups: Record<Client['stage'], Client[]>; onStageChange: (id: string, stage: Client['stage']) => void; onEdit: (entity: Client) => void; }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {clientStageOptions.map(stage => {
            const items = groups[stage] || [];
            return (
                <div key={stage} className="bg-surface border border-border rounded-lg p-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-zinc-500">
                        <span>{stage}</span>
                        <span>{items.length}</span>
                    </div>
                    <div className="space-y-2 flex-1">
                        {items.length === 0 && (
                            <div className="text-[11px] text-zinc-600 border border-dashed border-zinc-800 rounded p-3 text-center">Empty</div>
                        )}
                        {items.map(entity => (
                            <div key={entity.id} className="bg-black/30 border border-zinc-800 rounded p-3 space-y-2">
                                <div className="flex items-center justify-between text-sm text-white gap-2">
                                    <span className="font-medium truncate">{entity.company || entity.name}</span>
                                    <button onClick={() => onEdit(entity)} className="text-zinc-500 hover:text-white">
                                        <Edit3 size={14} />
                                    </button>
                                </div>
                                <div className="text-[11px] text-zinc-500 truncate">{entity.name}</div>
                                <div className="text-[11px] text-emerald-400 font-mono">${(entity.rate || 0).toLocaleString()}</div>
                                <div className="text-xs text-zinc-400">{entity.nextAction || 'No next step'}</div>
                                <select
                                    value={entity.stage || 'LEAD'}
                                    onChange={e => onStageChange(entity.id, e.target.value as Client['stage'])}
                                    className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 focus:border-zinc-500 outline-none"
                                >
                                    {clientStageOptions.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
    </div>
);

const ClientCardGrid = ({ entities, onStageChange, onUpdate }: { entities: Client[]; onStageChange: (id: string, stage: Client['stage']) => void; onUpdate: (id: string, updates: Partial<Client>) => void; }) => {
    if (entities.length === 0) {
        return <EmptyState label="No deals captured" />;
    }

    const statusOptions = statusFilters.filter(option => option !== 'ALL');

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {entities.map(entity => (
                <div key={entity.id} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Deal</div>
                            <input 
                                value={entity.company || ''}
                                onChange={(e) => onUpdate(entity.id, { company: e.target.value })}
                                placeholder="Company / Project"
                                className="w-full bg-transparent border border-transparent focus:border-zinc-700 rounded px-1 py-0.5 text-sm font-semibold text-white"
                            />
                            <input 
                                value={entity.name}
                                onChange={(e) => onUpdate(entity.id, { name: e.target.value })}
                                placeholder="Primary contact"
                                className="w-full bg-transparent border border-transparent focus:border-zinc-700 rounded px-1 py-0.5 text-xs text-zinc-400"
                            />
                        </div>
                        <select
                            value={entity.stage || 'LEAD'}
                            onChange={(e) => onStageChange(entity.id, e.target.value as Client['stage'])}
                            className="text-[11px] font-mono bg-black border border-zinc-800 rounded px-2 py-1 text-zinc-300 focus:border-emerald-500 outline-none"
                        >
                            {clientStageOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px] text-zinc-500">
                        <div>
                            <div className="uppercase font-mono text-[10px] mb-1">Status</div>
                            <select
                                value={entity.status}
                                onChange={(e) => onUpdate(entity.id, { status: e.target.value })}
                                className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:border-zinc-500 outline-none"
                            >
                                {statusOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="uppercase font-mono text-[10px] mb-1">Value</div>
                            <input 
                                type="number"
                                value={entity.rate?.toString() || ''}
                                onChange={(e) => onUpdate(entity.id, { rate: parseFloat(e.target.value) || 0 })}
                                placeholder="USD"
                                className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:border-zinc-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-zinc-500 uppercase">Next step</label>
                        <textarea 
                            value={entity.nextAction || ''}
                            onChange={(e) => onUpdate(entity.id, { nextAction: e.target.value })}
                            placeholder="e.g. Send proposal, book demo"
                            className="w-full bg-black/40 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:border-emerald-500 outline-none resize-none"
                            rows={2}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-zinc-500 uppercase">Notes / Scope</label>
                        <textarea 
                            value={entity.needs || ''}
                            onChange={(e) => onUpdate(entity.id, { needs: e.target.value })}
                            placeholder="Scope, blockers, context"
                            className="w-full bg-black/40 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:border-zinc-600 outline-none resize-none"
                            rows={2}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono text-zinc-500 uppercase">Contact</label>
                        <input 
                            value={entity.contactHandle || ''}
                            onChange={(e) => onUpdate(entity.id, { contactHandle: e.target.value })}
                            placeholder="@handle / email"
                            className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:border-zinc-500 outline-none"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

const StageBadge = ({ stage }: { stage?: Client['stage'] }) => {
    if (!stage) return null;
    const palette: Record<Client['stage'], string> = {
        'LEAD': 'text-blue-400 border-blue-900/40 bg-blue-950/20',
        'DISCOVERY': 'text-amber-400 border-amber-900/40 bg-amber-950/20',
        'PROPOSAL': 'text-purple-400 border-purple-900/40 bg-purple-950/20',
        'CLOSED': 'text-emerald-400 border-emerald-900/40 bg-emerald-950/20',
        'LOST': 'text-zinc-400 border-zinc-800 bg-zinc-900/60'
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase border ${palette[stage]}`}>
            {stage}
        </span>
    );
};

const StatusBadge = ({ status }: { status?: string }) => {
    if (!status) return null;
    const palette: Record<string, string> = {
        'ACTIVE': 'text-emerald-400 border-emerald-900/40 bg-emerald-950/20',
        'PAUSED': 'text-zinc-400 border-zinc-800 bg-zinc-900/60',
        'OFFBOARDING': 'text-amber-300 border-amber-900/30 bg-amber-950/10',
        'LEAD': 'text-blue-400 border-blue-900/40 bg-blue-950/20',
        'INTERVIEWING': 'text-amber-400 border-amber-900/40 bg-amber-950/20',
        'SOURCED': 'text-sky-400 border-sky-900/40 bg-sky-950/20',
        'HOLD': 'text-zinc-400 border-zinc-800 bg-zinc-900/60',
        'WARM': 'text-orange-400 border-orange-900/40 bg-orange-950/20',
        'COLD': 'text-zinc-400 border-zinc-800 bg-zinc-900/60'
    };

    return (
        <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase border ${palette[status] || 'text-zinc-500 border-zinc-800'}`}>
            {status}
        </span>
    );
};

const EmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-zinc-600 gap-2">
        <Clock3 size={28} className="opacity-40" />
        <span className="text-xs font-mono uppercase tracking-widest">{label}</span>
    </div>
);

const needsFollowUp = (entity: Client) => {
    const windowMs = entity.context === 'NEMO' ? followUpThreshold.NEMO : followUpThreshold.PERSONAL;
    return Date.now() - entity.lastInteraction > windowMs;
};

const formatDaysSince = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
};

const AddEntityModal: React.FC<{ 
    initialContext: EntityContext, 
    onClose: () => void, 
    onSave: (c: Client) => void 
}> = ({ initialContext, onClose, onSave }) => {
    const [context, setContext] = useState<EntityContext>(initialContext);
    const [type, setType] = useState<EntityType>('TEAM');
    const [circle, setCircle] = useState<PersonalCircle>('FRIEND');
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [company, setCompany] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [status, setStatus] = useState('ACTIVE');
    const [rate, setRate] = useState('');
    const [rateType, setRateType] = useState<'HOURLY'|'MONTHLY'|'FIXED'>('HOURLY');

    const tagSuggestions = context === 'NEMO' 
        ? ['Frontend', 'Backend', 'Design', 'Marketing', 'Lead', 'Contractor']
        : ['Family', 'Friend', 'Mentor', 'Peer', 'Uni', 'Gym'];

    const handleAddTag = (t: string) => {
        if(!t.trim()) return;
        if(!tags.includes(t)) setTags([...tags, t]);
        setTagInput('');
    };

    const handleSave = () => {
        if(!name) return;
        const finalType = context === 'PERSONAL' ? 'NETWORK' : type;
        const computedRole = context === 'PERSONAL' ? (personalCategoryLabels[circle] || 'Contact') : role;
        const finalTags = context === 'PERSONAL' ? Array.from(new Set([circle, ...tags])) : tags;

        onSave({
            id: generateId(),
            name,
            role: computedRole,
            company,
            context,
            type: finalType,
            status,
            tags: finalTags,
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
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        <Plus size={18} className="text-emerald-500" /> New Network Entry
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                </div>

                <div className="overflow-y-auto p-6 space-y-8">
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
                                <div className="flex items-center gap-2 mb-1 text-sm font-bold text-zinc-200"><UserIcon size={16}/> Personal</div>
                                <div className="text-xs text-zinc-500">Friends, Family, Mentors</div>
                            </button>
                        </div>
                        {context === 'NEMO' ? (
                            <div className="flex gap-2">
                                <SelectPill active={type === 'TEAM'} onClick={() => setType('TEAM')} label="Team Member" icon={<Users size={14}/>} />
                                <SelectPill active={type === 'CANDIDATE'} onClick={() => setType('CANDIDATE')} label="Candidate" icon={<Star size={14}/>} />
                                <SelectPill active={type === 'CLIENT'} onClick={() => setType('CLIENT')} label="Client" icon={<Briefcase size={14}/>} />
                                <SelectPill active={type === 'PARTNER'} onClick={() => setType('PARTNER')} label="Partner" icon={<Handshake size={14}/>} />
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <SelectPill active={circle === 'FRIEND'} onClick={() => setCircle('FRIEND')} label="Friend" icon={<Heart size={14}/>} />
                                <SelectPill active={circle === 'FAMILY'} onClick={() => setCircle('FAMILY')} label="Family" icon={<Users size={14}/>} />
                                <SelectPill active={circle === 'MENTOR'} onClick={() => setCircle('MENTOR')} label="Mentor" icon={<Briefcase size={14}/>} />
                                <SelectPill active={circle === 'ALLY'} onClick={() => setCircle('ALLY')} label="High Value" icon={<Star size={14}/>} />
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Identity Details</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full bg-black border border-zinc-800 rounded px-4 py-3 text-zinc-200 focus:border-emerald-500 outline-none"/>
                            </div>
                            {context === 'NEMO' && (
                                <input value={role} onChange={e => setRole(e.target.value)} placeholder="Role (e.g. Dev)" className="bg-black border border-zinc-800 rounded px-4 py-3 text-zinc-200 focus:border-zinc-600 outline-none text-sm"/>
                            )}
                            <input value={company} onChange={e => setCompany(e.target.value)} placeholder={context === 'NEMO' ? 'Organization' : 'City / Context'} className="bg-black border border-zinc-800 rounded px-4 py-3 text-zinc-200 focus:border-zinc-600 outline-none text-sm"/>
                        </div>
                    </div>

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
                                {['ACTIVE', 'PAUSED', 'OFFBOARDING', 'LEAD', 'INTERVIEWING', 'SOURCED', 'HOLD', 'WARM', 'COLD'].map(s => (
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

export default NetworkView;
