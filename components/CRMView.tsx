import React, { useState, useEffect } from 'react';
import { AppState, Client, CRMStage, CRMNote, EntityContext } from '../types';
import NetworkView from './NetworkView';
import { generateId } from '../utils';
import {
    LayoutDashboard,
    Kanban as KanbanIcon,
    Users,
    Settings,
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Briefcase,
    ChevronRight,
    Phone,
    Mail,
    Globe,
    DollarSign,
    Calendar,
    X,
    CheckSquare,
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
    User
} from 'lucide-react';

interface Props {
    state: AppState;
    onUpdate: (id: string, updates: Partial<Client>) => void;
    onDelete: (id: string) => void;
    onAdd: (client: Client) => void; // Ensure this is available for conversion to create new entities
}

type CRMViewMode = 'DASHBOARD' | 'LEADS' | 'DEALS' | 'CONTACTS' | 'ACCOUNTS' | 'TASKS' | 'MEETINGS' | 'REPORTS' | 'ANALYTICS' | 'TEAM' | 'PARTNERS';

const CRMView: React.FC<Props> = ({ state, onAdd, onUpdate, onDelete }) => {
    const [viewMode, setViewMode] = useState<CRMViewMode>('DASHBOARD');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [pipelineFilter, setPipelineFilter] = useState<'ALL' | 'DEV' | 'RETAINER'>('ALL'); // Pipeline Toggle State
    const [isCreating, setIsCreating] = useState(false);
    const [context, setContext] = useState<EntityContext>('NEMO');
    const [openEntityId, setOpenEntityId] = useState<string | null>(null);

    const allClients = state.clients.filter(c => c.context === context);

    // Filter Logic
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

    // Filter deals based on pipeline
    const filteredDeals = pipelineFilter === 'ALL'
        ? deals
        : deals.filter(d => d.tags.includes(pipelineFilter));

    // Conversion Handler
    const handleConvert = (leadId: string, dealName: string, dealValue: number, pipeline: 'DEV' | 'RETAINER') => {
        const lead = state.clients.find(c => c.id === leadId);
        if (!lead) return;

        // 1. Update Lead -> Contact
        onUpdate(leadId, {
            status: 'ACTIVE',
            role: 'Contact', // Persist as the contact person
            type: 'CLIENT'
        });

        // 2. Create Account (Company) - avoid dupes in real app, simple check here
        const existingAccount = accounts.find(a => a.name === lead.company);
        if (!existingAccount && lead.company) {
            onAdd({
                id: generateId(),
                name: lead.company,
                company: lead.company, // Self-ref
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

        // 3. Create Deal
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
            tags: [pipeline], // Tag for pipeline filtering
            rate: 0, rateType: 'FIXED', currency: 'USD',
            lastInteraction: Date.now(),
            nextAction: 'Discovery Call'
        });

        setOpenEntityId(null); // Close canvas
    };

    // Derived Accounts (Unique Companies)
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
                company: 'Self' // Table visual hack
            };
        });

    return (
        <div className="h-full flex bg-background text-zinc-100 overflow-hidden font-sans">

            {/* SIDEBAR - Zoho Style (Collapsible, darker/distinct background) */}
            <div className={`
        hidden md:flex
        ${sidebarOpen ? 'w-60' : 'w-16'} 
        bg-zinc-950 border-r border-zinc-800 transition-all duration-300 flex-col shrink-0 z-20
      `}>
                <div className="h-16 flex items-center justify-center border-b border-zinc-800/50 relative overflow-hidden group">
                    {/* CONTEXT SWITCHER HEADER */}
                    <button
                        onClick={() => setContext(context === 'NEMO' ? 'PERSONAL' : 'NEMO')}
                        className={`transition-all duration-300 ${sidebarOpen ? 'w-full px-6' : 'w-full px-0 flex justify-center'} flex items-center gap-3 hover:bg-zinc-900/50 py-2 rounded-lg mx-2`}
                    >
                        {sidebarOpen ? (
                            <div className="flex items-center gap-3">
                                {context === 'NEMO' ? <NemoLogo size={28} /> : <div className="w-7 h-7 bg-zinc-800 rounded-full flex items-center justify-center"><User size={14} /></div>}
                                <div className="flex flex-col items-start">
                                    <span className="font-bold text-lg tracking-tighter text-white leading-none">{context === 'NEMO' ? 'NOEMAN' : 'PERSONAL'}</span>
                                    <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">{context === 'NEMO' ? 'Kernel' : 'Network'}</span>
                                </div>
                            </div>
                        ) : (
                            context === 'NEMO' ? <NemoLogo size={32} /> : <User size={24} className="text-zinc-400" />
                        )}
                    </button>
                </div>




                {/* Navigation Items */}
                <div className="flex-1 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {context === 'NEMO' ? (
                        <>
                            <SidebarItem
                                icon={<LayoutDashboard size={18} />}
                                label="Dashboard"
                                active={viewMode === 'DASHBOARD'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('DASHBOARD')}
                            />
                            <div className="my-2 border-t border-zinc-800/50 mx-4" />
                            <SidebarItem
                                icon={<Target size={18} />}
                                label="Leads"
                                active={viewMode === 'LEADS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('LEADS')}
                                count={leads.length}
                            />
                            <SidebarItem
                                icon={<Users size={18} />}
                                label="Contacts"
                                active={viewMode === 'CONTACTS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('CONTACTS')}
                                count={clientsOnly.length}
                            />
                            <SidebarItem
                                icon={<Building2 size={18} />}
                                label="Accounts"
                                active={viewMode === 'ACCOUNTS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('ACCOUNTS')}
                            />
                            <div className="my-2 border-t border-zinc-800/50 mx-4" />
                            <SidebarItem
                                icon={<Briefcase size={18} />}
                                label="Deals Pipeline"
                                active={viewMode === 'DEALS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('DEALS')}
                                count={deals.length}
                            />
                            <SidebarItem
                                icon={<ListTodo size={18} />}
                                label="Tasks"
                                active={viewMode === 'TASKS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('TASKS')}
                            />
                            <SidebarItem
                                icon={<CalendarDays size={18} />}
                                label="Meetings"
                                active={viewMode === 'MEETINGS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('MEETINGS')}
                            />
                            <div className="my-2 border-t border-zinc-800/50 mx-4" />
                            <SidebarItem
                                icon={<BarChart3 size={18} />}
                                label="Reports"
                                active={viewMode === 'REPORTS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('REPORTS')}
                            />
                            <SidebarItem
                                icon={<PieChart size={18} />}
                                label="Analytics"
                                active={viewMode === 'ANALYTICS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('ANALYTICS')}
                            />
                            <div className="my-2 border-t border-zinc-800/50 mx-4" />
                            <SidebarItem
                                icon={<UserCog size={18} />}
                                label="Team"
                                active={viewMode === 'TEAM'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('TEAM')}
                                count={team.length}
                            />
                            <SidebarItem
                                icon={<Handshake size={18} />}
                                label="Partners"
                                active={viewMode === 'PARTNERS'}
                                expanded={sidebarOpen}
                                onClick={() => setViewMode('PARTNERS')}
                                count={partners.length}
                            />
                        </>
                    ) : (
                        <div className="px-4 text-xs text-zinc-500 font-mono mt-4">
                            Personal Network active. <br /> Switch to Agency to view modules.
                        </div>
                    )}

                </div>

                {/* Bottom Actions */}
                <div className="p-2 border-t border-zinc-800/50">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-full flex items-center justify-center p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded transition-colors"
                    >
                        {sidebarOpen ? <ChevronRight size={16} className="rotate-180" /> : <ChevronRight size={16} />}
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-900/30 relative">

                {/* Top Bar - "Module Header" */}
                <header className="h-14 bg-background/95 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        {/* Mobile Module Switcher */}
                        <div className="md:hidden">
                            <select
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value as CRMViewMode)}
                                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded px-2 py-1 outline-none"
                            >
                                <option value="DASHBOARD">Dashboard</option>
                                <option value="LEADS">Leads</option>
                                <option value="DEALS">Deals</option>
                                <option value="CONTACTS">Contacts</option>
                            </select>
                        </div>
                        <h1 className="hidden md:block text-lg font-semibold text-zinc-100 uppercase tracking-wide">
                            {viewMode}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Global Search */}
                        <div className="relative group hidden sm:block">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                className="bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-zinc-300 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none w-40 md:w-64 transition-all"
                                placeholder="Search CRM..."
                            />
                        </div>

                        <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors hidden sm:block">
                            <Settings size={18} />
                        </button>
                        <button
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
                            onClick={() => setIsCreating(true)}
                        >
                            <Plus size={14} />
                            <span className="hidden sm:inline">Create New</span>
                        </button>
                    </div>
                </header>

                {/* Content Body */}
                <main className="flex-1 overflow-hidden p-0 relative">

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

                            {viewMode === 'TEAM' && (
                                <ListModule
                                    data={team}
                                    columns={['Name', 'Role', 'Focus Area', 'Status']}
                                    onRowClick={(id) => console.log('Open team member', id)}
                                />
                            )}

                            {viewMode === 'PARTNERS' && (
                                <ListModule
                                    data={partners}
                                    columns={['Name', 'Company', 'Type', 'Status']}
                                    onRowClick={(id) => console.log('Open partner', id)}
                                />
                            )}

                            {/* Placeholders for new modules */}
                            {(viewMode === 'ACCOUNTS' || viewMode === 'TASKS' || viewMode === 'MEETINGS' || viewMode === 'REPORTS' || viewMode === 'ANALYTICS') && (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                                        <Settings size={24} className="animate-spin-slow" />
                                    </div>
                                    <h3 className="text-lg font-bold text-zinc-300">Module Under Construction</h3>
                                    <p className="text-xs max-w-xs text-center mt-2">The {viewMode.toLowerCase()} module is currently being implemented to match Zoho CRM specifications.</p>
                                </div>
                            )}

                        </>
                    )}
                </main>

                {/* CANVAS DETAIL OVERLAY */}
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

                {/* CREATE MODAL */}
                {isCreating && (
                    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Create New Record</h2>
                                <button onClick={() => setIsCreating(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
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
        </div >
    );
};

const NemoLogo = ({ size = 32 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4V28H8L18 12V28H22V4H18L8 20V4H4Z" fill="currentColor" className="text-emerald-500" />
        <path d="M22 4H28V10H22V4Z" fill="currentColor" className="text-zinc-100" />
    </svg>
);

// --- SUB-COMPONENTS (Will potentially move to separate files if they grow) ---

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
        w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all border-l-2
        ${active
                    ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-transparent'
                }
      `}
            title={!expanded ? label : undefined}
        >
            <span className="shrink-0">{icon}</span>
            {expanded && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate">{label}</span>
                    {count !== undefined && (
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            {count}
                        </span>
                    )}
                </div>
            )}
        </button>
    );
};

const DashboardModule = ({ state, leads, deals }: { state: AppState, leads: Client[], deals: Client[] }) => {
    // Calculate specific metrics
    const totalPipelineValue = deals.reduce((acc, deal) => acc + (deal.expectedValue || 0), 0);

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard title="Total Leads" value={leads.length} change="+2 this week" color="blue" />
                <MetricCard title="Open Deals" value={deals.length} change="ACTIVE" color="emerald" />
                <MetricCard title="Pipeline Value" value={`$${totalPipelineValue.toLocaleString()}`} change="Est. Revenue" color="amber" />
                <MetricCard title="Win Rate" value="24%" change="-2% vs last mo" color="rose" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                {/* Placeholder Charts */}
                <div className="bg-surface border border-zinc-800 rounded-lg p-4 flex flex-col">
                    <h3 className="text-sm font-semibold text-zinc-400 mb-4">Lead Sources</h3>
                    <div className="flex-1 flex items-center justify-center bg-zinc-900/50 rounded border border-zinc-800/50 border-dashed">
                        <span className="text-zinc-600 text-xs">Chart Placeholder: Donut</span>
                    </div>
                </div>
                <div className="bg-surface border border-zinc-800 rounded-lg p-4 flex flex-col">
                    <h3 className="text-sm font-semibold text-zinc-400 mb-4">Revenue Forecast</h3>
                    <div className="flex-1 flex items-center justify-center bg-zinc-900/50 rounded border border-zinc-800/50 border-dashed">
                        <span className="text-zinc-600 text-xs">Chart Placeholder: Bar</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, change, color }: any) => (
    <div className="bg-surface border border-zinc-800 p-4 rounded-lg shadow-sm hover:border-zinc-700 transition-all">
        <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{title}</h3>
        <div className="text-2xl font-bold text-zinc-100 mb-2">{value}</div>
        <div className={`text-xs font-mono flex items-center gap-1 text-${color}-500`}>
            {change}
        </div>
    </div>
);

const ListModule = ({ data, columns, onRowClick }: { data: any[], columns: string[], onRowClick: (id: string) => void }) => {
    // Simple Table Implementation
    return (
        <div className="h-full overflow-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-900 sticky top-0 z-10 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    <tr>
                        {columns.map((col: string, i: number) => (
                            <th key={i} className="px-6 py-3">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-sm text-zinc-300">
                    {data.map((item: any) => (
                        <tr
                            key={item.id}
                            onClick={() => onRowClick(item.id)}
                            className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                        >
                            <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                            <td className="px-6 py-4">{item.company || '-'}</td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded textxs font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    {item.stage || item.status}
                                </span>
                            </td>
                            <td className="px-6 py-4">{item.leadSource || '-'}</td>
                            <td className="px-6 py-4 text-zinc-500 text-xs">
                                {new Date(item.lastInteraction).toLocaleDateString()}
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="px-6 py-12 text-center text-zinc-500 text-sm">
                                No records found in this view.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

const KanbanModule = ({ deals, filter, setFilter, onUpdate, onRowClick }: { deals: Client[], filter: any, setFilter: any, onUpdate: any, onRowClick: (id: string) => void }) => {
    // Group by Stage
    const stages = [
        { id: CRMStage.DISCOVERY, label: 'Discovery', color: 'blue' },
        { id: CRMStage.PROPOSAL, label: 'Proposal', color: 'amber' },
        { id: CRMStage.NEGOTIATION, label: 'Negotiation', color: 'purple' },
        { id: CRMStage.CLOSED_WON, label: 'Won', color: 'emerald' },
    ];

    // Stalled Logic (7 days)
    const isStalled = (lastInteraction: number) => {
        const diff = Date.now() - lastInteraction;
        return diff > 7 * 24 * 60 * 60 * 1000;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Pipeline Toggles */}
            <div className="px-6 py-2 border-b border-zinc-800 flex items-center gap-4 bg-zinc-900/30">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pipeline:</span>
                <div className="flex bg-zinc-900 rounded p-1 border border-zinc-800">
                    {['ALL', 'DEV', 'RETAINER'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 text-xs font-medium rounded transition-all ${filter === f ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {f === 'ALL' ? 'All Deals' : f === 'DEV' ? 'Development' : 'Retainers'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-x-auto p-6">
                <div className="flex gap-4 h-full min-w-max">
                    {stages.map(stage => {
                        const stageDeals = deals.filter(d => d.stage === stage.id);
                        const totalValue = stageDeals.reduce((sum, d) => sum + (d.expectedValue || 0), 0);

                        return (
                            <div key={stage.id} className="w-80 flex flex-col bg-zinc-900/40 rounded-xl border border-zinc-800/50">
                                {/* Header */}
                                <div className={`p-3 border-b border-zinc-800/50 border-t-4 border-t-${stage.color}-500/50 rounded-t-xl bg-zinc-900`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="font-semibold text-sm text-zinc-200">{stage.label}</h3>
                                        <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 rounded">{stageDeals.length}</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-mono">
                                        Est: ${totalValue.toLocaleString()}
                                    </div>
                                </div>

                                {/* Cards */}
                                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                    {stageDeals.map(deal => {
                                        const stalled = isStalled(deal.lastInteraction);
                                        return (
                                            <div
                                                key={deal.id}
                                                onClick={() => onRowClick(deal.id)}
                                                className={`bg-surface p-3 rounded border shadow-sm cursor-grab active:cursor-grabbing transition-all group relative ${stalled ? 'border-red-900/50 bg-red-950/10' : 'border-zinc-800 hover:border-emerald-500/50'}`}
                                            >
                                                {stalled && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Stalled (>7 days)" />}

                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-sm font-medium text-zinc-100 line-clamp-1">{deal.name}</span>
                                                    <button className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-opacity">
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                </div>
                                                <div className="text-xs text-zinc-500 mb-2">{deal.company}</div>

                                                {deal.expectedValue && (
                                                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-mono mb-2">
                                                        <DollarSign size={10} />
                                                        {deal.expectedValue.toLocaleString()}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-900 flex items-center justify-center text-[8px]">nm</div>
                                                        {deal.tags?.includes('RETAINER') && <span className="text-[9px] bg-purple-900/30 text-purple-400 px-1 rounded">RET</span>}
                                                        {deal.tags?.includes('DEV') && <span className="text-[9px] bg-blue-900/30 text-blue-400 px-1 rounded">DEV</span>}
                                                    </div>
                                                    <span className={`text-[10px] ${stalled ? 'text-red-400 font-bold' : 'text-zinc-600'}`}>
                                                        {new Date(deal.lastInteraction).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {stageDeals.length === 0 && (
                                        <div className="h-24 flex items-center justify-center text-zinc-700 text-xs border border-dashed border-zinc-800 rounded">
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
    // Determine entity type and standard fields
    let entity = state.clients.find(c => c.id === entityId);

    // Safety check
    if (!entity) return null;

    const [activeTab, setActiveTab] = useState<'TIMELINE' | 'INFO' | 'NOTES' | 'ACTIVITIES'>('TIMELINE');
    const [isEditing, setIsEditing] = useState(false);

    // Conversion State
    const [isConverting, setIsConverting] = useState(false);
    const [convertData, setConvertData] = useState({ dealName: '', value: 0, pipeline: 'DEV' });

    // Pre-fill convert data
    useEffect(() => {
        if (isConverting) {
            setConvertData(prev => ({ ...prev, dealName: `${entity!.company} Project` }));
        }
    }, [isConverting, entity]);

    // Edit Form State
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
        if (window.confirm('Are you sure you want to delete this record? This cannot be undone.')) {
            onDelete(entity!.id);
            onClose();
        }
    };

    const triggerConvert = () => {
        onConvert(entity!.id, convertData.dealName, convertData.value, convertData.pipeline);
    };

    if (isConverting) {
        return (
            <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Convert Lead</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">Deal Name</label>
                            <input
                                value={convertData.dealName}
                                onChange={e => setConvertData({ ...convertData, dealName: e.target.value })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">Expected Value ($)</label>
                            <input
                                type="number"
                                value={convertData.value}
                                onChange={e => setConvertData({ ...convertData, value: parseInt(e.target.value) })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">Pipeline</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setConvertData({ ...convertData, pipeline: 'DEV' })}
                                    className={`flex-1 py-2 text-xs rounded border ${convertData.pipeline === 'DEV' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                                >
                                    Development
                                </button>
                                <button
                                    onClick={() => setConvertData({ ...convertData, pipeline: 'RETAINER' })}
                                    className={`flex-1 py-2 text-xs rounded border ${convertData.pipeline === 'RETAINER' ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                                >
                                    Retainer
                                </button>
                            </div>
                        </div>
                        <div className="pt-2 flex gap-2">
                            <button onClick={triggerConvert} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded text-sm font-bold transition-colors">
                                Convert & Create Deal
                            </button>
                            <button onClick={() => setIsConverting(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded text-sm font-bold transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-40 bg-black/20 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-2xl h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header (Business Card) */}
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-lg border border-zinc-700 flex items-center justify-center text-xl font-bold text-zinc-300">
                                {entity.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <input
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-lg font-bold text-white w-full"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                value={editForm.role}
                                                onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                                placeholder="Role"
                                                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 w-32"
                                            />
                                            <input
                                                value={editForm.company}
                                                onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                                                placeholder="Company"
                                                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 w-32"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-xl font-bold text-white mb-1">{entity.name}</h2>
                                        <p className="text-sm text-zinc-400 flex items-center gap-2">
                                            {entity.role} {entity.company && `at ${entity.company}`}
                                        </p>
                                    </>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-2 py-0.5 bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 rounded text-[10px] font-mono uppercase">
                                        {entity.stage || entity.status}
                                    </span>
                                    <span className="text-zinc-600 text-xs">•</span>
                                    <span className="text-xs text-zinc-500">Last touch: {new Date(entity.lastInteraction).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <button onClick={handleSave} className="p-2 bg-emerald-600 text-white rounded hover:bg-emerald-500 transition-colors">
                                        <CheckSquare size={18} />
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="p-2 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 transition-colors">
                                        <X size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setIsEditing(true)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Edit">
                                        <Pencil size={18} />
                                    </button>
                                    <button onClick={handleDelete} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded transition-colors" title="Delete">
                                        <Trash2 size={18} />
                                    </button>
                                    <div className="w-px h-6 bg-zinc-800 mx-2" />
                                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors">
                                        <X size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-4">
                        {entity.status === 'LEAD' ? (
                            <button
                                onClick={() => setIsConverting(true)}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckSquare size={14} />
                                Convert to Deal
                            </button>
                        ) : (
                            <>
                                <button className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs text-zinc-200 font-medium">
                                    Values & Notes
                                </button>
                                <button className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs text-zinc-200 font-medium">
                                    Send Email
                                </button>
                                <button className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs text-zinc-200 font-medium">
                                    Schedule Meeting
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800 px-6">
                    {['TIMELINE', 'INFO', 'NOTES', 'ACTIVITIES'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-3 text-xs font-bold tracking-wide border-b-2 transition-colors ${activeTab === tab ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
                    {activeTab === 'TIMELINE' && (
                        <div className="space-y-6 relative ml-2">
                            {/* Vertical Line */}
                            <div className="absolute left-[7px] top-2 bottom-0 w-px bg-zinc-800" />

                            {/* Mock Timeline Items */}
                            <TimelineItem
                                icon={<Calendar size={14} />}
                                title="Meeting Scheduled"
                                time="Today, 2:00 PM"
                                desc="Review of Q1 proposal with engineering team."
                            />
                            <TimelineItem
                                icon={<Mail size={14} />}
                                title="Email Sent"
                                time="Yesterday"
                                desc="Follow up on previous conversation regarding timeline pricing."
                            />
                            <TimelineItem
                                icon={<CheckSquare size={14} />}
                                title="Task Completed"
                                time="Jan 2, 2024"
                                desc="Prepare slide deck for initial pitch."
                            />
                            <TimelineItem
                                icon={<Plus size={14} />}
                                title="Lead Created"
                                time="Dec 28, 2023"
                                desc="Imported from LinkedIn"
                            />
                        </div>
                    )}

                    {activeTab === 'INFO' && (
                        <div className="grid grid-cols-2 gap-6">
                            {isEditing ? (
                                <>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">Phone</label>
                                            <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-200" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">Email</label>
                                            <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-200" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">Website</label>
                                            <input value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-200" />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {isEditing ? (
                                        <>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">Phone</label>
                                                    <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-200" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">Email</label>
                                                    <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-200" />
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">Website</label>
                                                    <input value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-200" />
                                                </div>
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
                                </>
                            )}

                            <div className="col-span-2 border-t border-zinc-800 pt-4 mt-2">
                                <h3 className="text-sm font-bold text-zinc-400 mb-3">Address Information</h3>
                                <InfoField label="Street" value="-" />
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <InfoField label="City" value="-" />
                                    <InfoField label="Country" value="-" />
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'NOTES' && (
                        <div className="text-center py-12 text-zinc-600 italic">
                            No notes added yet.
                        </div>
                    )}
                    {activeTab === 'ACTIVITIES' && (
                        <div className="text-center py-12 text-zinc-600 italic">
                            No open activities.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

const TimelineItem = ({ icon, title, time, desc }: any) => (
    <div className="relative pl-8">
        <div className="absolute left-0 top-0.5 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0 z-10">
            {icon}
        </div>
        <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-zinc-200">{title}</span>
                <span className="text-[10px] text-zinc-500">{time}</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
        </div>
    </div>
)

const InfoField = ({ label, value }: any) => (
    <div>
        <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">{label}</label>
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
                            className={`flex items-center gap-2 text-sm cursor-pointer ${type === 'LEADS' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}
                        >
                            <div className={`w-3 h-3 rounded-full border ${type === 'LEADS' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`} />
                            Lead
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('DEALS')}
                            className={`flex items-center gap-2 text-sm cursor-pointer ${type === 'DEALS' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}
                        >
                            <div className={`w-3 h-3 rounded-full border ${type === 'DEALS' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`} />
                            Deal
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={() => setType('CONTACTS')}
                    className={`flex items-center gap-2 text-sm cursor-pointer ${type === 'CONTACTS' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}
                >
                    <div className={`w-3 h-3 rounded-full border ${type === 'CONTACTS' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`} />
                    Contact
                </button>
            </div>

            <div className="space-y-3">
                <input
                    placeholder="Full Name *"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black/20 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    autoFocus
                />
                <div className="grid grid-cols-2 gap-3">
                    <input
                        placeholder="Company"
                        value={formData.company}
                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                        className="bg-black/20 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                    <input
                        placeholder="Title / Role"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="bg-black/20 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="bg-black/20 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                    <input
                        placeholder="Phone"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-black/20 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                </div>

                {type === 'DEALS' && (
                    <div className="pt-2 border-t border-zinc-800">
                        <label className="text-xs text-zinc-500 mb-1 block">Deal Value ($)</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={formData.value}
                            onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-black/20 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded transition-colors">Create Record</button>
            </div>
        </form>
    )
};

export default CRMView;
