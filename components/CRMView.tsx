import React, { useState, useEffect } from 'react';
import { AppState, Client, CRMStage, CRMNote, EntityContext } from '../types';
import NetworkView from './NetworkView';
import { generateId } from '../utils';
import {
    LayoutGrid,
    Briefcase,
    Users,
    Settings,
    Plus,
    Search,
    MoreHorizontal,
    ChevronRight,
    Phone,
    Mail,
    Globe,
    DollarSign,
    Calendar,
    X,
    CheckCircle2,
    Pencil,
    Trash2,
    Building2,
    Target,
    Handshake,
    UserCog,
    BarChart3,
    PieChart,
    ListTodo,
    CalendarDays,
    User,
    ArrowUpRight,
    Zap
} from 'lucide-react';

interface Props {
    state: AppState;
    onUpdate: (id: string, updates: Partial<Client>) => void;
    onDelete: (id: string) => void;
    onAdd: (client: Client) => void;
}

type CRMViewMode = 'DASHBOARD' | 'LEADS' | 'DEALS' | 'CONTACTS' | 'ACCOUNTS' | 'TASKS' | 'MEETINGS' | 'REPORTS' | 'ANALYTICS' | 'TEAM' | 'PARTNERS';

const CRMView: React.FC<Props> = ({ state, onAdd, onUpdate, onDelete }) => {
    const [viewMode, setViewMode] = useState<CRMViewMode>('DASHBOARD');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [pipelineFilter, setPipelineFilter] = useState<'ALL' | 'DEV' | 'RETAINER'>('ALL');
    const [isCreating, setIsCreating] = useState(false);
    const [context, setContext] = useState<EntityContext>('NEMO');
    const [openEntityId, setOpenEntityId] = useState<string | null>(null);

    const allClients = state.clients.filter(c => c.context === context);

    const leads = allClients.filter(c => c.type === 'CLIENT' && c.status === 'LEAD');
    const clientsOnly = allClients.filter(c => c.type === 'CLIENT' && c.status !== 'LEAD');
    const team = allClients.filter(c => c.type === 'TEAM');
    const partners = allClients.filter(c => c.type === 'PARTNER');

    const deals = allClients.filter(c =>
        c.stage === CRMStage.DISCOVERY ||
        c.stage === CRMStage.PROPOSAL ||
        c.stage === CRMStage.NEGOTIATION ||
        c.stage === CRMStage.CLOSED_WON ||
        c.stage === CRMStage.CLOSED_LOST ||
        c.role === 'Deal'
    );

    const filteredDeals = pipelineFilter === 'ALL'
        ? deals
        : deals.filter(d => d.tags.includes(pipelineFilter));

    const handleConvert = (leadId: string, dealName: string, dealValue: number, pipeline: 'DEV' | 'RETAINER') => {
        const lead = state.clients.find(c => c.id === leadId);
        if (!lead) return;

        onUpdate(leadId, {
            status: 'ACTIVE',
            role: 'Contact',
            type: 'CLIENT'
        });

        const existingAccount = accounts.find(a => a.name === lead.company);
        if (!existingAccount && lead.company) {
            onAdd({
                id: generateId(),
                name: lead.company,
                company: lead.company,
                role: 'Account',
                context: 'NEMO',
                type: 'CLIENT',
                status: 'ACTIVE',
                tags: ['ACCOUNT'],
                rate: 0,
                rateType: 'NONE',
                currency: 'USD',
                lastInteraction: Date.now(),
                nextAction: 'Onboard',
            });
        }

        onAdd({
            id: generateId(),
            name: dealName || `${lead.company} Deal`,
            company: lead.company,
            role: 'Deal',
            context: 'NEMO',
            type: 'CLIENT',
            status: 'ACTIVE',
            stage: CRMStage.DISCOVERY,
            expectedValue: dealValue,
            tags: [pipeline],
            rate: 0, rateType: 'FIXED', currency: 'USD',
            lastInteraction: Date.now(),
            nextAction: 'Discovery Call'
        });

        setOpenEntityId(null);
    };

    const accounts = Array.from(new Set(allClients.map(c => c.company).filter(c => c && c !== 'N/A')))
        .map((company, index) => {
            const relatedClients = allClients.filter(c => c.company === company);
            return {
                id: `acc_${index}`,
                name: company,
                industry: relatedClients[0]?.industry || 'Technology',
                website: relatedClients[0]?.website || '',
                contactsCount: relatedClients.length,
                lastInteraction: Math.max(...relatedClients.map(c => c.lastInteraction)),
                company: 'Self'
            };
        });

    return (
        <div className="h-full flex bg-background text-zinc-100 overflow-hidden">

            {/* SIDEBAR */}
            <div className={`
                hidden md:flex
                ${sidebarOpen ? 'w-60' : 'w-16'}
                bg-surface border-r border-border transition-all duration-300 flex-col shrink-0 z-20
            `}>
                <div className="h-12 flex items-center justify-center border-b border-border">
                    <button
                        onClick={() => setContext(context === 'NEMO' ? 'PERSONAL' : 'NEMO')}
                        className={`transition-all ${sidebarOpen ? 'w-full px-4' : 'w-full px-0 flex justify-center'} flex items-center gap-3 hover:bg-zinc-900/50 py-2 h-full`}
                    >
                        {sidebarOpen ? (
                            <div className="flex items-center gap-3">
                                {context === 'NEMO' ? <NemoLogo size={24} /> : <div className="w-6 h-6 bg-zinc-800 rounded-sm flex items-center justify-center"><User size={14} /></div>}
                                <div className="flex flex-col items-start">
                                    <span className="font-bold text-sm text-zinc-100 leading-none">{context === 'NEMO' ? 'NOEMAN' : 'PERSONAL'}</span>
                                    <span className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase">{context === 'NEMO' ? 'CRM' : 'Network'}</span>
                                </div>
                            </div>
                        ) : (
                            context === 'NEMO' ? <NemoLogo size={28} /> : <User size={20} className="text-zinc-400" />
                        )}
                    </button>
                </div>

                <div className="flex-1 py-2 overflow-y-auto">
                    {context === 'NEMO' ? (
                        <>
                            <SidebarItem
                                icon={<LayoutGrid size={16} />}
                                label="Dashboard"
                                active={viewMode === 'DASHBOARD'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('DASHBOARD')}
                            />
                            <div className="my-2 border-t border-zinc-900/50 mx-4" />
                            <SidebarItem
                                icon={<Target size={16} />}
                                label="Leads"
                                active={viewMode === 'LEADS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('LEADS')}
                                count={leads.length}
                            />
                            <SidebarItem
                                icon={<Users size={16} />}
                                label="Contacts"
                                active={viewMode === 'CONTACTS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('CONTACTS')}
                                count={clientsOnly.length}
                            />
                            <SidebarItem
                                icon={<Building2 size={16} />}
                                label="Accounts"
                                active={viewMode === 'ACCOUNTS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('ACCOUNTS')}
                            />
                            <div className="my-2 border-t border-zinc-900/50 mx-4" />
                            <SidebarItem
                                icon={<Briefcase size={16} />}
                                label="Deals"
                                active={viewMode === 'DEALS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('DEALS')}
                                count={deals.length}
                            />
                            <SidebarItem
                                icon={<ListTodo size={16} />}
                                label="Tasks"
                                active={viewMode === 'TASKS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('TASKS')}
                            />
                            <SidebarItem
                                icon={<CalendarDays size={16} />}
                                label="Meetings"
                                active={viewMode === 'MEETINGS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('MEETINGS')}
                            />
                            <div className="my-2 border-t border-zinc-900/50 mx-4" />
                            <SidebarItem
                                icon={<BarChart3 size={16} />}
                                label="Reports"
                                active={viewMode === 'REPORTS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('REPORTS')}
                            />
                            <SidebarItem
                                icon={<PieChart size={16} />}
                                label="Analytics"
                                active={viewMode === 'ANALYTICS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('ANALYTICS')}
                            />
                            <div className="my-2 border-t border-zinc-900/50 mx-4" />
                            <SidebarItem
                                icon={<UserCog size={16} />}
                                label="Team"
                                active={viewMode === 'TEAM'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('TEAM')}
                                count={team.length}
                            />
                            <SidebarItem
                                icon={<Handshake size={16} />}
                                label="Partners"
                                active={viewMode === 'PARTNERS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('PARTNERS')}
                                count={partners.length}
                            />
                        </>
                    ) : (
                        <div className="px-4 text-xs text-zinc-500 font-mono mt-4">
                            Personal Network active. Switch to Agency to view modules.
                        </div>
                    )}
                </div>

                <div className="p-2 border-t border-border">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-full flex items-center justify-center p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-sm transition-colors"
                    >
                        {sidebarOpen ? <ChevronRight size={16} className="rotate-180" /> : <ChevronRight size={16} />}
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                {/* Top Bar */}
                <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="md:hidden">
                            <select
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value as CRMViewMode)}
                                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-sm px-2 py-1 outline-none font-mono"
                            >
                                <option value="DASHBOARD">Dashboard</option>
                                <option value="LEADS">Leads</option>
                                <option value="DEALS">Deals</option>
                                <option value="CONTACTS">Contacts</option>
                            </select>
                        </div>
                        <h1 className="hidden md:block text-sm font-mono text-zinc-300 uppercase tracking-wider">
                            {viewMode}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group hidden sm:block">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                            <input
                                className="bg-zinc-900 border border-zinc-800 rounded-sm pl-8 pr-3 py-1.5 text-xs text-zinc-300 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none w-32 md:w-48 transition-all"
                                placeholder="Search..."
                            />
                        </div>

                        <button className="hidden sm:block p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-sm transition-colors">
                            <Settings size={16} />
                        </button>
                        <button
                            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 rounded-sm text-xs font-bold transition-all"
                            onClick={() => setIsCreating(true)}
                        >
                            <Plus size={14} />
                            <span className="hidden sm:inline">New</span>
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-hidden p-0 relative bg-background">

                    {context === 'PERSONAL' ? (
                        <NetworkView state={state} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
                    ) : (
                        <>
                            {viewMode === 'DASHBOARD' && (
                                <DashboardModule state={state} leads={leads} deals={filteredDeals} />
                            )}

                            {viewMode === 'LEADS' && (
                                <ListModule
                                    data={leads}
                                    columns={['Name', 'Company', 'Stage', 'Source', 'Last Touch']}
                                    onRowClick={(id) => setOpenEntityId(id)}
                                />
                            )}

                            {viewMode === 'DEALS' && (
                                <KanbanModule
                                    deals={filteredDeals}
                                    filter={pipelineFilter}
                                    setFilter={setPipelineFilter}
                                    onUpdate={onUpdate}
                                    onRowClick={(id: string) => setOpenEntityId(id)}
                                />
                            )}

                            {viewMode === 'CONTACTS' && (
                                <ListModule
                                    data={clientsOnly}
                                    columns={['Name', 'Company', 'Email', 'Role', 'Status']}
                                    onRowClick={(id) => setOpenEntityId(id)}
                                />
                            )}

                            {viewMode === 'ACCOUNTS' && (
                                <ListModule
                                    data={accounts}
                                    columns={['Name', 'Industry', 'Website', 'Contacts', 'Last Touch']}
                                    onRowClick={(id) => console.log("Open account", id)}
                                />
                            )}

                            {viewMode === 'TEAM' && (
                                <ListModule
                                    data={team}
                                    columns={['Name', 'Role', 'Focus Area', 'Status']}
                                    onRowClick={(id) => setOpenEntityId(id)}
                                />
                            )}

                            {viewMode === 'PARTNERS' && (
                                <ListModule
                                    data={partners}
                                    columns={['Name', 'Company', 'Type', 'Status']}
                                    onRowClick={(id) => setOpenEntityId(id)}
                                />
                            )}

                            {(viewMode === 'TASKS' || viewMode === 'MEETINGS' || viewMode === 'REPORTS' || viewMode === 'ANALYTICS') && (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                    <div className="w-12 h-12 bg-zinc-900 rounded-sm flex items-center justify-center mb-3">
                                        <Settings size={20} />
                                    </div>
                                    <h3 className="text-sm font-mono text-zinc-400 uppercase tracking-wider">Module In Progress</h3>
                                    <p className="text-xs max-w-xs text-center mt-2 text-zinc-600">The {viewMode.toLowerCase()} module is being implemented.</p>
                                </div>
                            )}
                        </>
                    )}
                </main>

                {/* Detail Canvas */}
                {openEntityId && (
                    <CRMDetailCanvas
                        entityId={openEntityId}
                        state={state}
                        onClose={() => setOpenEntityId(null)}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onConvert={handleConvert}
                    />
                )}

                {/* Create Modal */}
                {isCreating && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-surface border border-border rounded-sm shadow-2xl w-full max-w-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                <h2 className="text-xs font-mono text-zinc-300 uppercase tracking-wider">Create Record</h2>
                                <button onClick={() => setIsCreating(false)} className="text-zinc-500 hover:text-zinc-200"><X size={16} /></button>
                            </div>
                            <div className="p-6">
                                <CreateForm
                                    context={context}
                                    onCancel={() => setIsCreating(false)}
                                    onSubmit={(data) => {
                                        onAdd(data);
                                        setIsCreating(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

const NemoLogo = ({ size = 32 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4V28H8L18 12V28H22V4H18L8 20V4H4Z" fill="currentColor" className="text-emerald-500" />
        <path d="M22 4H28V10H22V4Z" fill="currentColor" className="text-zinc-100" />
    </svg>
);

const SidebarItem = ({
    icon,
    label,
    active,
    expanded,
    onClick,
    count
}: {
    icon: React.ReactNode,
    label: string,
    active: boolean,
    expanded: boolean,
    onClick: () => void,
    count?: number
}) => {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-3 py-2 text-xs font-medium transition-all border-l-2
                ${active
                    ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border-transparent'
                }
            `}
            title={!expanded ? label : undefined}
        >
            <span className="shrink-0">{icon}</span>
            {expanded && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate">{label}</span>
                    {count !== undefined && (
                        <span className="text-[9px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded-sm font-mono">
                            {count}
                        </span>
                    )}
                </div>
            )}
        </button>
    );
};

const DashboardModule = ({ state, leads, deals }: { state: AppState, leads: Client[], deals: Client[] }) => {
    const totalPipelineValue = deals.reduce((acc, deal) => acc + (deal.expectedValue || 0), 0);

    return (
        <div className="p-4 md:p-6 h-full overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard title="Leads" value={leads.length} change="+2 this week" icon={<Target size={14} />} />
                <MetricCard title="Open Deals" value={deals.length} change="Active" icon={<Briefcase size={14} />} />
                <MetricCard title="Pipeline" value={`$${totalPipelineValue.toLocaleString()}`} change="Est. Revenue" icon={<DollarSign size={14} />} />
                <MetricCard title="Win Rate" value="24%" change="-2% vs last mo" icon={<ArrowUpRight size={14} />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px]">
                <div className="bg-surface border border-border rounded-sm p-4 flex flex-col">
                    <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-4">Lead Sources</h3>
                    <div className="flex-1 flex items-center justify-center bg-zinc-950 rounded-sm border border-zinc-900 border-dashed">
                        <span className="text-zinc-700 text-xs font-mono">Chart Placeholder</span>
                    </div>
                </div>
                <div className="bg-surface border border-border rounded-sm p-4 flex flex-col">
                    <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-4">Revenue Forecast</h3>
                    <div className="flex-1 flex items-center justify-center bg-zinc-950 rounded-sm border border-zinc-900 border-dashed">
                        <span className="text-zinc-700 text-xs font-mono">Chart Placeholder</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, change, icon }: any) => (
    <div className="bg-surface border border-border p-4 rounded-sm hover:border-zinc-700 transition-all">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{title}</h3>
            <div className="text-zinc-600">{icon}</div>
        </div>
        <div className="text-2xl font-medium text-zinc-100 mb-1">{value}</div>
        <div className="text-[10px] font-mono text-zinc-600">
            {change}
        </div>
    </div>
);

const ListModule = ({ data, columns, onRowClick }: { data: any[], columns: string[], onRowClick: (id: string) => void }) => {
    return (
        <div className="h-full overflow-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-surface sticky top-0 z-10 border-b border-border text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    <tr>
                        {columns.map((col: string, i: number) => (
                            <th key={i} className="px-4 md:px-6 py-3">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/50 text-sm text-zinc-300">
                    {data.map((item: any) => (
                        <tr
                            key={item.id}
                            onClick={() => onRowClick(item.id)}
                            className="hover:bg-zinc-900/40 cursor-pointer transition-colors"
                        >
                            <td className="px-4 md:px-6 py-3 font-medium text-zinc-100">{item.name}</td>
                            <td className="px-4 md:px-6 py-3">{item.company || '-'}</td>
                            <td className="px-4 md:px-6 py-3">
                                <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                                    {item.stage || item.status}
                                </span>
                            </td>
                            <td className="px-4 md:px-6 py-3 text-zinc-500">{item.leadSource || '-'}</td>
                            <td className="px-4 md:px-6 py-3 text-zinc-600 text-xs font-mono">
                                {new Date(item.lastInteraction).toLocaleDateString()}
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="px-6 py-12 text-center text-zinc-600 text-xs font-mono">
                                No records found
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

const KanbanModule = ({ deals, filter, setFilter, onUpdate, onRowClick }: { deals: Client[], filter: any, setFilter: any, onUpdate: any, onRowClick: (id: string) => void }) => {
    const stages = [
        { id: CRMStage.DISCOVERY, label: 'Discovery', color: 'blue' },
        { id: CRMStage.PROPOSAL, label: 'Proposal', color: 'amber' },
        { id: CRMStage.NEGOTIATION, label: 'Negotiation', color: 'purple' },
        { id: CRMStage.CLOSED_WON, label: 'Won', color: 'emerald' },
    ];

    const isStalled = (lastInteraction: number) => {
        const diff = Date.now() - lastInteraction;
        return diff > 7 * 24 * 60 * 60 * 1000;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Pipeline Filter */}
            <div className="px-4 md:px-6 py-3 border-b border-border flex items-center gap-3 bg-surface">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Pipeline:</span>
                <div className="flex bg-zinc-900 rounded-sm p-0.5 border border-zinc-800">
                    {['ALL', 'DEV', 'RETAINER'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 text-[10px] font-mono rounded-sm transition-all ${filter === f ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {f === 'ALL' ? 'All' : f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-x-auto p-4 md:p-6">
                <div className="flex gap-3 h-full min-w-max">
                    {stages.map(stage => {
                        const stageDeals = deals.filter(d => d.stage === stage.id);
                        const totalValue = stageDeals.reduce((sum, d) => sum + (d.expectedValue || 0), 0);

                        return (
                            <div key={stage.id} className="w-72 flex flex-col bg-surface rounded-sm border border-border">
                                <div className={`p-3 border-b border-border border-t-2 ${stage.color === 'blue' ? 'border-t-blue-500' : stage.color === 'amber' ? 'border-t-amber-500' : stage.color === 'purple' ? 'border-t-purple-500' : 'border-t-emerald-500'}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="font-medium text-xs text-zinc-200 uppercase tracking-wider">{stage.label}</h3>
                                        <span className="text-[10px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded-sm font-mono">{stageDeals.length}</span>
                                    </div>
                                    <div className="text-[9px] text-zinc-600 font-mono">
                                        ${totalValue.toLocaleString()}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                    {stageDeals.map(deal => {
                                        const stalled = isStalled(deal.lastInteraction);
                                        return (
                                            <div
                                                key={deal.id}
                                                onClick={() => onRowClick(deal.id)}
                                                className={`bg-zinc-900 p-3 rounded-sm border cursor-pointer transition-all group relative ${stalled ? 'border-red-900/50' : 'border-zinc-800 hover:border-emerald-500/50'}`}
                                            >
                                                {stalled && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500" title="Stalled" />}

                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-medium text-zinc-200 line-clamp-1">{deal.name}</span>
                                                    <button className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-opacity">
                                                        <MoreHorizontal size={12} />
                                                    </button>
                                                </div>
                                                <div className="text-[10px] text-zinc-500 mb-2 font-mono">{deal.company}</div>

                                                {deal.expectedValue && (
                                                    <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-mono mb-2">
                                                        <DollarSign size={10} />
                                                        {deal.expectedValue.toLocaleString()}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-4 h-4 rounded-sm bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] font-mono text-zinc-500">nm</div>
                                                        {deal.tags?.includes('RETAINER') && <span className="text-[8px] bg-purple-950/30 text-purple-400 px-1 py-0.5 rounded-sm font-mono">RET</span>}
                                                        {deal.tags?.includes('DEV') && <span className="text-[8px] bg-blue-950/30 text-blue-400 px-1 py-0.5 rounded-sm font-mono">DEV</span>}
                                                    </div>
                                                    <span className={`text-[9px] font-mono ${stalled ? 'text-red-400' : 'text-zinc-600'}`}>
                                                        {new Date(deal.lastInteraction).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {stageDeals.length === 0 && (
                                        <div className="h-20 flex items-center justify-center text-zinc-700 text-[10px] border border-dashed border-zinc-800 rounded-sm font-mono">
                                            Empty
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const CRMDetailCanvas = ({ entityId, state, onClose, onUpdate, onDelete, onConvert }: { entityId: string, state: AppState, onClose: () => void, onUpdate: any, onDelete: any, onConvert: any }) => {
    let entity = state.clients.find(c => c.id === entityId);

    if (!entity) return null;

    const [activeTab, setActiveTab] = useState<'TIMELINE' | 'INFO' | 'NOTES' | 'ACTIVITIES'>('TIMELINE');
    const [isEditing, setIsEditing] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [convertData, setConvertData] = useState({ dealName: '', value: 0, pipeline: 'DEV' });

    useEffect(() => {
        if (isConverting) {
            setConvertData(prev => ({ ...prev, dealName: `${entity!.company} Project` }));
        }
    }, [isConverting, entity]);

    const [editForm, setEditForm] = useState({
        name: entity.name,
        role: entity.role,
        company: entity.company,
        email: entity.email || '',
        phone: entity.phone || '',
        website: entity.website || ''
    });

    const handleSave = () => {
        onUpdate(entity!.id, editForm);
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (window.confirm('Delete this record?')) {
            onDelete(entity!.id);
            onClose();
        }
    };

    const triggerConvert = () => {
        onConvert(entity!.id, convertData.dealName, convertData.value, convertData.pipeline);
    };

    if (isConverting) {
        return (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-surface border border-border rounded-sm shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                        <h2 className="text-xs font-mono text-zinc-300 uppercase tracking-wider">Convert Lead</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-[10px] uppercase text-zinc-500 font-mono mb-1 block tracking-wider">Deal Name</label>
                            <input
                                value={convertData.dealName}
                                onChange={e => setConvertData({ ...convertData, dealName: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-sm text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-zinc-500 font-mono mb-1 block tracking-wider">Value ($)</label>
                            <input
                                type="number"
                                value={convertData.value}
                                onChange={e => setConvertData({ ...convertData, value: parseInt(e.target.value) })}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-sm text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-zinc-500 font-mono mb-1 block tracking-wider">Pipeline</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setConvertData({ ...convertData, pipeline: 'DEV' })}
                                    className={`flex-1 py-2 text-xs rounded-sm border font-mono ${convertData.pipeline === 'DEV' ? 'bg-emerald-950/20 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                >
                                    DEV
                                </button>
                                <button
                                    onClick={() => setConvertData({ ...convertData, pipeline: 'RETAINER' })}
                                    className={`flex-1 py-2 text-xs rounded-sm border font-mono ${convertData.pipeline === 'RETAINER' ? 'bg-purple-950/20 border-purple-500 text-purple-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                >
                                    RETAINER
                                </button>
                            </div>
                        </div>
                        <div className="pt-2 flex gap-2">
                            <button onClick={triggerConvert} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-2 rounded-sm text-xs font-bold transition-colors">
                                Convert
                            </button>
                            <button onClick={() => setIsConverting(false)} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 py-2 rounded-sm text-xs font-bold transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-40 bg-black/40 flex justify-end">
            <div className="w-full max-w-2xl h-full bg-surface border-l border-border shadow-2xl flex flex-col">

                {/* Header */}
                <div className="p-4 md:p-6 border-b border-border">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-900 rounded-sm border border-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
                                {entity.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <input
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="bg-zinc-900 border border-zinc-800 rounded-sm px-2 py-1 text-base font-medium text-zinc-100 w-full"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                value={editForm.role}
                                                onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                                placeholder="Role"
                                                className="bg-zinc-900 border border-zinc-800 rounded-sm px-2 py-1 text-xs text-zinc-300 w-24"
                                            />
                                            <input
                                                value={editForm.company}
                                                onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                                                placeholder="Company"
                                                className="bg-zinc-900 border border-zinc-800 rounded-sm px-2 py-1 text-xs text-zinc-300 w-32"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-base font-medium text-zinc-100 mb-0.5">{entity.name}</h2>
                                        <p className="text-xs text-zinc-500 font-mono">
                                            {entity.role} {entity.company && `at ${entity.company}`}
                                        </p>
                                    </>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-2 py-0.5 bg-emerald-950/20 text-emerald-400 border border-emerald-900 rounded-sm text-[9px] font-mono uppercase tracking-wider">
                                        {entity.stage || entity.status}
                                    </span>
                                    <span className="text-zinc-700 text-xs">•</span>
                                    <span className="text-[10px] text-zinc-600 font-mono">{new Date(entity.lastInteraction).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <button onClick={handleSave} className="p-1.5 bg-emerald-500 text-black rounded-sm hover:bg-emerald-400 transition-colors">
                                        <CheckCircle2 size={16} />
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="p-1.5 bg-zinc-900 text-zinc-400 rounded-sm hover:bg-zinc-800 transition-colors">
                                        <X size={16} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setIsEditing(true)} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-sm transition-colors" title="Edit">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={handleDelete} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-sm transition-colors" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="w-px h-5 bg-zinc-800 mx-1" />
                                    <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-sm transition-colors">
                                        <X size={18} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        {entity.status === 'LEAD' ? (
                            <button
                                onClick={() => setIsConverting(true)}
                                className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-sm text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                            >
                                <CheckCircle2 size={14} />
                                Convert to Deal
                            </button>
                        ) : (
                            <>
                                <button className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-sm text-xs text-zinc-300 font-medium">
                                    Email
                                </button>
                                <button className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-sm text-xs text-zinc-300 font-medium">
                                    Meeting
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border px-4 md:px-6">
                    {['TIMELINE', 'INFO', 'NOTES', 'ACTIVITIES'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-3 py-2.5 text-[10px] font-mono tracking-wider border-b-2 transition-colors ${activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
                    {activeTab === 'TIMELINE' && (
                        <div className="space-y-4 relative ml-2">
                            <div className="absolute left-[7px] top-2 bottom-0 w-px bg-zinc-900" />

                            <TimelineItem
                                icon={<Calendar size={12} />}
                                title="Meeting Scheduled"
                                time="Today, 2:00 PM"
                                desc="Review Q1 proposal with team."
                            />
                            <TimelineItem
                                icon={<Mail size={12} />}
                                title="Email Sent"
                                time="Yesterday"
                                desc="Follow up on conversation."
                            />
                            <TimelineItem
                                icon={<CheckCircle2 size={12} />}
                                title="Task Completed"
                                time="Jan 2"
                                desc="Slide deck prepared."
                            />
                            <TimelineItem
                                icon={<Plus size={12} />}
                                title="Lead Created"
                                time="Dec 28"
                                desc="Imported from LinkedIn"
                            />
                        </div>
                    )}

                    {activeTab === 'INFO' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isEditing ? (
                                <>
                                    <div>
                                        <label className="text-[10px] uppercase text-zinc-500 font-mono mb-1 block tracking-wider">Phone</label>
                                        <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-sm text-zinc-200" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase text-zinc-500 font-mono mb-1 block tracking-wider">Email</label>
                                        <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-sm text-zinc-200" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] uppercase text-zinc-500 font-mono mb-1 block tracking-wider">Website</label>
                                        <input value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-sm text-zinc-200" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <InfoField label="Phone" value={entity.phone || '-'} />
                                    <InfoField label="Email" value={entity.email || '-'} />
                                    <InfoField label="Website" value={entity.website || '-'} />
                                    <InfoField label="Industry" value={entity.industry || '-'} />
                                </>
                            )}
                        </div>
                    )}
                    {activeTab === 'NOTES' && (
                        <div className="text-center py-12 text-zinc-600 text-xs font-mono">
                            No notes added yet.
                        </div>
                    )}
                    {activeTab === 'ACTIVITIES' && (
                        <div className="text-center py-12 text-zinc-600 text-xs font-mono">
                            No activities.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

const TimelineItem = ({ icon, title, time, desc }: any) => (
    <div className="relative pl-7">
        <div className="absolute left-0 top-0.5 w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0 z-10">
            {icon}
        </div>
        <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-zinc-200">{title}</span>
                <span className="text-[9px] text-zinc-600 font-mono">{time}</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
        </div>
    </div>
)

const InfoField = ({ label, value }: any) => (
    <div>
        <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1 tracking-wider">{label}</label>
        <div className="text-sm text-zinc-200">{value}</div>
    </div>
)

const CreateForm = ({ context, onCancel, onSubmit }: { context: EntityContext, onCancel: () => void, onSubmit: (data: Client) => void }) => {
    const [type, setType] = useState<CRMViewMode>(context === 'NEMO' ? 'LEADS' : 'CONTACTS');
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        email: '',
        phone: '',
        title: '',
        value: 0
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newClient: Client = {
            id: generateId(),
            name: formData.name,
            company: formData.company,
            role: formData.title || 'N/A',
            email: formData.email,
            phone: formData.phone,
            context: context,
            type: context === 'NEMO' ? 'CLIENT' : 'NETWORK',
            status: type === 'LEADS' ? 'LEAD' : 'ACTIVE',
            stage: type === 'LEADS' ? CRMStage.LEAD : type === 'DEALS' ? CRMStage.DISCOVERY : 'LEAD',
            expectedValue: formData.value,
            rate: 0,
            rateType: 'NONE',
            currency: 'USD',
            lastInteraction: Date.now(),
            nextAction: 'Initial Outreach',
            tags: []
        };
        onSubmit(newClient);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 mb-4">
                {context === 'NEMO' && (
                    <>
                        <button
                            type="button"
                            onClick={() => setType('LEADS')}
                            className={`flex items-center gap-2 text-xs cursor-pointer font-mono ${type === 'LEADS' ? 'text-emerald-400' : 'text-zinc-500'}`}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full border ${type === 'LEADS' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`} />
                            Lead
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('DEALS')}
                            className={`flex items-center gap-2 text-xs cursor-pointer font-mono ${type === 'DEALS' ? 'text-emerald-400' : 'text-zinc-500'}`}
                        >
                            <div className={`w-2.5 h-2.5 rounded-full border ${type === 'DEALS' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`} />
                            Deal
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={() => setType('CONTACTS')}
                    className={`flex items-center gap-2 text-xs cursor-pointer font-mono ${type === 'CONTACTS' ? 'text-emerald-400' : 'text-zinc-500'}`}
                >
                    <div className={`w-2.5 h-2.5 rounded-full border ${type === 'CONTACTS' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`} />
                    Contact
                </button>
            </div>

            <div className="space-y-3">
                <input
                    placeholder="Full Name *"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none"
                    autoFocus
                />
                <div className="grid grid-cols-2 gap-3">
                    <input
                        placeholder="Company"
                        value={formData.company}
                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                        className="bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none"
                    />
                    <input
                        placeholder="Title / Role"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none"
                    />
                    <input
                        placeholder="Phone"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none"
                    />
                </div>

                {type === 'DEALS' && (
                    <div className="pt-2 border-t border-zinc-800">
                        <label className="text-[10px] text-zinc-500 font-mono mb-1 block tracking-wider uppercase">Deal Value ($)</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={formData.value}
                            onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none"
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-sm transition-colors">Create</button>
            </div>
        </form>
    )
};

export default CRMView;
