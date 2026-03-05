import React, { useState, useMemo } from 'react';
import {
    AppState, Transaction, Account, AccountType, FinanceCategory,
    ForecastEntry, ForecastStatus, RecurringRule, RecurringFrequency,
    Obligation, ObligationType, LedgerSettings
} from '../types';
import { generateId } from '../utils';
import {
    Plus, CreditCard, TrendingUp, TrendingDown, Wallet, Edit2, Check, X, Trash2,
    BarChart2, Calendar, Tag, RefreshCw, Filter, Settings, ArrowUpRight,
    ArrowDownLeft, ChevronDown, ChevronUp, CheckCircle, AlertCircle,
    DollarSign, Zap, Eye, EyeOff, ToggleLeft, ToggleRight, MoreHorizontal, Layout
} from 'lucide-react';

// ─── TABLE COLUMN SYSTEM ──────────────────────────────────────────────────────

type ColumnId = 'date' | 'description' | 'category' | 'account' | 'fees' | 'in' | 'out' | 'balance' | 'notes';

interface ColDef { id: ColumnId; label: string; width: string; align?: 'right' }

const COL_DEFS: ColDef[] = [
    { id: 'date',        label: 'Date',     width: '100px' },
    { id: 'description', label: 'Details',  width: '1fr'   },
    { id: 'category',    label: 'Category', width: '140px' },
    { id: 'account',     label: 'Account',  width: '90px'  },
    { id: 'fees',        label: 'Fees',     width: '80px',  align: 'right' },
    { id: 'in',          label: 'In',       width: '90px',  align: 'right' },
    { id: 'out',         label: 'Out',      width: '90px',  align: 'right' },
    { id: 'balance',     label: 'Balance',  width: '110px', align: 'right' },
    { id: 'notes',       label: 'Notes',    width: '180px', align: 'right' },
];

type TablePresetId = 'simple' | 'compact' | 'standard' | 'detailed';

const TABLE_PRESETS: { id: TablePresetId; label: string; cols: ColumnId[] }[] = [
    { id: 'simple',   label: 'Simple',   cols: ['date', 'description', 'in', 'out', 'balance'] },
    { id: 'compact',  label: 'Compact',  cols: ['date', 'description', 'category', 'in', 'out', 'balance'] },
    { id: 'standard', label: 'Standard', cols: ['date', 'description', 'category', 'account', 'in', 'out', 'balance', 'notes'] },
    { id: 'detailed', label: 'Detailed', cols: ['date', 'description', 'category', 'account', 'fees', 'in', 'out', 'balance', 'notes'] },
];

function getActiveCols(presetId: TablePresetId, overrides: Record<string, boolean>): ColumnId[] {
    const base = TABLE_PRESETS.find(p => p.id === presetId)?.cols || TABLE_PRESETS[2].cols;
    return COL_DEFS
        .filter(c => (c.id in overrides ? overrides[c.id] : base.includes(c.id)))
        .map(c => c.id);
}

function buildGrid(cols: ColumnId[]): string {
    return cols.map(id => COL_DEFS.find(c => c.id === id)!.width).join(' ');
}

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface Props {
    state: AppState;
    onAdd: (tx: Transaction) => void;
    onUpdate: (id: string, updates: Partial<Transaction>) => void;
    onDeleteTransaction: (id: string) => void;
    onAddAccount: (account: Account) => void;
    onUpdateAccount: (id: string, updates: Partial<Account>) => void;
    onDeleteAccount: (id: string) => void;
    onAddCategory: (cat: FinanceCategory) => void;
    onUpdateCategory: (id: string, updates: Partial<FinanceCategory>) => void;
    onDeleteCategory: (id: string) => void;
    onAddForecastEntry: (entry: ForecastEntry) => void;
    onUpdateForecastEntry: (id: string, updates: Partial<ForecastEntry>) => void;
    onDeleteForecastEntry: (id: string) => void;
    onApproveForecastEntry: (id: string) => void;
    onAddRecurringRule: (rule: RecurringRule) => void;
    onUpdateRecurringRule: (id: string, updates: Partial<RecurringRule>) => void;
    onDeleteRecurringRule: (id: string) => void;
    onAddObligation: (obligation: Obligation) => void;
    onUpdateObligation: (id: string, updates: Partial<Obligation>) => void;
    onDeleteObligation: (id: string) => void;
    onUpdateLedgerSettings: (updates: Partial<LedgerSettings>) => void;
}

type LedgerTab = 'ledger' | 'subscriptions' | 'obligations' | 'analytics' | 'settings';
type DateRange = 'all' | 'this-month' | 'last-3-months' | 'this-year';

// ─── UTILITIES ────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EGP: 'E£', EUR: '€', GBP: '£' };

function fmtCurrency(amount: number, currency = 'USD'): string {
    const sym = CURRENCY_SYMBOLS[currency] || '$';
    return `${sym}${Math.abs(amount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function fmtMonthYear(ts: number): string {
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function getDateRangeBounds(range: DateRange): { start: number; end: number } {
    const now = new Date();
    if (range === 'this-month') {
        return { start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), end: Date.now() };
    } else if (range === 'last-3-months') {
        return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime(), end: Date.now() };
    } else if (range === 'this-year') {
        return { start: new Date(now.getFullYear(), 0, 1).getTime(), end: Date.now() };
    }
    return { start: 0, end: Date.now() };
}

function getMonthlyAmount(rule: RecurringRule): number {
    switch (rule.frequency) {
        case 'daily': return rule.amount * 30;
        case 'weekly': return rule.amount * 4.33;
        case 'biweekly': return rule.amount * 2.17;
        case 'monthly': return rule.amount;
        case 'quarterly': return rule.amount / 3;
        case 'yearly': return rule.amount / 12;
        default: return rule.amount;
    }
}

function parseQuickEntry(input: string, accounts: Account[]): Partial<Transaction> | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    let type: 'INCOME' | 'EXPENSE' = 'EXPENSE';
    let rest = trimmed;
    if (rest.startsWith('+')) { type = 'INCOME'; rest = rest.slice(1).trim(); }
    else if (rest.startsWith('-')) { type = 'EXPENSE'; rest = rest.slice(1).trim(); }
    const tokens = rest.split(/\s+/);
    const amount = parseFloat(tokens[0]);
    if (isNaN(amount) || amount <= 0) return null;
    const wordTokens = tokens.slice(1);
    let accountId: string | undefined;
    if (wordTokens.length > 1) {
        const last = wordTokens[wordTokens.length - 1].toLowerCase();
        const match = accounts.find(a => a.name.toLowerCase().includes(last));
        if (match) { accountId = match.id; wordTokens.pop(); }
    }
    return { amount: type === 'INCOME' ? amount : -amount, type, description: wordTokens.join(' '), accountId };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const LedgerView: React.FC<Props> = (props) => {
    const { state } = props;
    const [activeTab, setActiveTab] = useState<LedgerTab>('ledger');
    const [showModal, setShowModal] = useState(false);
    const [modalPreset, setModalPreset] = useState<Partial<Transaction>>({});

    const currency = state.userPreferences?.currency || 'USD';

    const currentBalance = useMemo(() =>
        state.transactions.reduce((s, t) => s + t.amount, 0),
        [state.transactions]
    );

    const plannedBalance = useMemo(() => {
        const forecastSum = state.forecastEntries
            .filter(e => e.status === 'planned' || e.status === 'recurring')
            .reduce((s, e) => s + e.amount, 0);
        return currentBalance + forecastSum;
    }, [currentBalance, state.forecastEntries]);

    const potentialBalance = useMemo(() => {
        const potentialSum = state.forecastEntries
            .filter(e => e.status === 'potential')
            .reduce((s, e) => s + e.amount, 0);
        return plannedBalance + potentialSum;
    }, [plannedBalance, state.forecastEntries]);

    const TABS: { key: LedgerTab; label: string }[] = [
        { key: 'ledger',        label: 'Ledger' },
        { key: 'subscriptions', label: 'Subscriptions' },
        { key: 'obligations',   label: 'Obligations' },
        { key: 'analytics',     label: 'Analytics' },
        { key: 'settings',      label: 'Settings' },
    ];

    return (
        <div className="h-full flex flex-col bg-background animate-fade-in">
            {/* ── Header ── */}
            <div className="border-b border-border bg-surface/20 px-4 md:px-6 pt-5 pb-0 shrink-0">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
                    <div>
                        <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">
                            Total Balance
                        </div>
                        <div className={`text-3xl md:text-4xl font-mono font-bold tracking-tight ${currentBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
                            {fmtCurrency(currentBalance, currency)}
                        </div>
                    </div>
                    <div className="flex gap-6 pb-1">
                        <div className="text-right">
                            <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5">Planned</div>
                            <div className={`text-base font-mono font-semibold ${plannedBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {fmtCurrency(plannedBalance, currency)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5">Potential</div>
                            <div className="text-base font-mono font-semibold text-zinc-500">
                                {fmtCurrency(potentialBalance, currency)}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Tab Nav — size+weight+underline contrast */}
                <div className="flex gap-0 overflow-x-auto">
                    {TABS.map(t => {
                        const isActive = activeTab === t.key;
                        return (
                            <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className={`relative px-4 py-2.5 whitespace-nowrap transition-all ${
                                    isActive ? 'text-white text-sm font-semibold' : 'text-zinc-500 text-xs font-normal hover:text-zinc-300'
                                }`}>
                                {t.label}
                                {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500 rounded-t" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Tab Content ── */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'ledger' && (
                    <LedgerTab
                        {...props}
                        currency={currency}
                        onOpenModal={(preset) => { setModalPreset(preset || {}); setShowModal(true); }}
                    />
                )}
                {activeTab === 'subscriptions' && <SubscriptionsTab {...props} currency={currency} />}
                {activeTab === 'obligations' && <ObligationsTab {...props} currency={currency} />}
                {activeTab === 'analytics' && <AnalyticsTab {...props} currency={currency} />}
                {activeTab === 'settings' && <LedgerSettingsTab {...props} />}
            </div>

            {/* ── Add Transaction Modal ── */}
            {showModal && (
                <TransactionModal
                    state={state}
                    currency={currency}
                    preset={modalPreset}
                    onClose={() => setShowModal(false)}
                    onSubmit={(tx) => { props.onAdd(tx); setShowModal(false); }}
                />
            )}
        </div>
    );
};

// ─── LEDGER TAB ───────────────────────────────────────────────────────────────

interface LedgerTabProps extends Props {
    currency: string;
    onOpenModal: (preset?: Partial<Transaction>) => void;
}

const LedgerTab: React.FC<LedgerTabProps> = ({ state, currency, onOpenModal, onUpdate, onDeleteTransaction, onAddAccount, onUpdateAccount, onDeleteAccount, onUpdateLedgerSettings, onAddForecastEntry, onDeleteForecastEntry, onApproveForecastEntry }) => {
    const [dateRange, setDateRange] = useState<DateRange>('this-month');
    const [filterAccount, setFilterAccount] = useState('all');
    const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [quickInput, setQuickInput] = useState('');
    const [forecastInput, setForecastInput] = useState('');
    const [showAccounts, setShowAccounts] = useState(true);
    const [inlineEditId, setInlineEditId] = useState<string | null>(null);
    const [inlineEdit, setInlineEdit] = useState<Partial<Transaction>>({});
    const [isManagingAccounts, setIsManagingAccounts] = useState(false);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

    const activePreset = ((state.ledgerSettings?.tablePreset as TablePresetId) || 'standard');
    const colOverrides = state.ledgerSettings?.columnOverrides || {};
    const activeCols = useMemo(() => getActiveCols(activePreset, colOverrides), [activePreset, colOverrides]);
    const gridTemplate = useMemo(() => buildGrid(activeCols), [activeCols]);

    const { start: rangeStart, end: rangeEnd } = getDateRangeBounds(dateRange);

    const filteredTxs = useMemo(() => state.transactions.filter(tx => {
        if (filterAccount !== 'all' && tx.accountId !== filterAccount) return false;
        if (filterType !== 'all' && tx.type !== filterType) return false;
        if (searchQuery && !tx.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (tx.date < rangeStart || tx.date > rangeEnd) return false;
        return true;
    }), [state.transactions, filterAccount, filterType, searchQuery, rangeStart, rangeEnd]);

    const startingBalance = useMemo(() => state.transactions
        .filter(tx => {
            if (filterAccount !== 'all' && tx.accountId !== filterAccount) return false;
            return tx.date < rangeStart;
        })
        .reduce((sum, tx) => sum + tx.amount, 0),
        [state.transactions, filterAccount, rangeStart]
    );

    const sortedWithBalance = useMemo(() => {
        const sorted = [...filteredTxs].sort((a, b) => a.date - b.date);
        let running = startingBalance;
        return sorted.map(tx => {
            running += tx.amount;
            return { ...tx, runningBalance: running };
        });
    }, [filteredTxs, startingBalance]);

    const closingBalance = sortedWithBalance.length > 0
        ? sortedWithBalance[sortedWithBalance.length - 1].runningBalance
        : startingBalance;

    const monthGroups = useMemo(() => {
        const groups: { key: string; txs: typeof sortedWithBalance }[] = [];
        const map = new Map<string, typeof sortedWithBalance>();
        sortedWithBalance.forEach(tx => {
            const key = fmtMonthYear(tx.date);
            if (!map.has(key)) { map.set(key, []); groups.push({ key, txs: map.get(key)! }); }
            map.get(key)!.push(tx);
        });
        return groups;
    }, [sortedWithBalance]);

    const byAccount = useMemo(() => {
        const map: Record<string, { account: Account; balance: number }> = {};
        state.accounts.forEach(acc => { map[acc.id] = { account: acc, balance: 0 }; });
        state.transactions.forEach(tx => {
            const key = tx.accountId || '';
            if (key && map[key]) map[key].balance += tx.amount;
        });
        return Object.values(map);
    }, [state.accounts, state.transactions]);

    const handleQuickSubmit = () => {
        const parsed = parseQuickEntry(quickInput, state.accounts);
        if (parsed) { onOpenModal(parsed); setQuickInput(''); }
    };

    const startInlineEdit = (tx: Transaction) => {
        setInlineEditId(tx.id);
        setInlineEdit({ description: tx.description, category: tx.category, notes: tx.notes });
    };

    const saveInlineEdit = () => {
        if (inlineEditId) { onUpdate(inlineEditId, inlineEdit); setInlineEditId(null); }
    };

    const DATE_RANGES: { key: DateRange; label: string }[] = [
        { key: 'this-month', label: 'Month' },
        { key: 'last-3-months', label: '3 Months' },
        { key: 'this-year', label: 'Year' },
        { key: 'all', label: 'All' },
    ];

    const handleForecastQuickSubmit = () => {
        const parsed = parseQuickEntry(forecastInput, state.accounts);
        if (!parsed) return;
        const entry: ForecastEntry = {
            id: generateId(), amount: parsed.amount!, date: Date.now() + 7 * 24 * 3600000,
            description: parsed.description || 'Forecast entry',
            type: parsed.type!, category: 'fc-other', status: 'planned',
            accountId: parsed.accountId,
        };
        onAddForecastEntry(entry);
        setForecastInput('');
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Toolbar: Quick Entry + Add */}
            <div className="px-4 md:px-6 py-2.5 border-b border-border shrink-0 flex gap-2 items-center">
                <Zap size={13} className="text-zinc-600 shrink-0" />
                <input value={quickInput} onChange={e => setQuickInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleQuickSubmit(); }}
                    placeholder="Quick entry: 50 coffee · +3000 salary wise · 200 rent"
                    className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none font-mono" />
                <button onClick={() => onOpenModal()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors shrink-0">
                    <Plus size={13} /> Add
                </button>
            </div>

            {/* Filter Row — high contrast chips */}
            <div className="px-4 md:px-6 py-2 border-b border-border/50 shrink-0 flex flex-wrap items-center gap-2">
                <div className="flex gap-0.5">
                    {DATE_RANGES.map(r => (
                        <button key={r.key} onClick={() => setDateRange(r.key)}
                            className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all ${
                                dateRange === r.key ? 'bg-white text-black font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                            }`}>
                            {r.label}
                        </button>
                    ))}
                </div>
                <div className="w-px h-3 bg-zinc-800" />
                {(['all', 'INCOME', 'EXPENSE'] as const).map(t => (
                    <button key={t} onClick={() => setFilterType(t)}
                        className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all ${
                            filterType === t ? 'bg-white text-black font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                        }`}>
                        {t === 'all' ? 'All' : t === 'INCOME' ? 'In' : 'Out'}
                    </button>
                ))}
                <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)}
                    className="bg-transparent border-0 text-xs text-zinc-500 outline-none cursor-pointer hover:text-zinc-300">
                    <option value="all">All Accounts</option>
                    {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-300 outline-none w-24 focus:border-zinc-600" />

                {/* Preset selector — secondary focus, small size */}
                <div className="ml-auto flex items-center gap-1">
                    <Layout size={11} className="text-zinc-700" />
                    {TABLE_PRESETS.map(p => (
                        <button key={p.id} onClick={() => onUpdateLedgerSettings({ tablePreset: p.id })}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                                activePreset === p.id ? 'bg-zinc-800 text-zinc-300 font-semibold' : 'text-zinc-700 hover:text-zinc-500'
                            }`}>
                            {p.label}
                        </button>
                    ))}
                    <button onClick={() => setIsManagingAccounts(!isManagingAccounts)}
                        className="ml-2 text-zinc-700 hover:text-zinc-400 p-1 transition-colors">
                        <Wallet size={12} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto px-4 md:px-6 py-4">

                {/* Account Cards (collapsible) */}
                {state.accounts.length > 0 && (
                    <div className="mb-6">
                        <button onClick={() => setShowAccounts(v => !v)}
                            className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-600 uppercase mb-2 hover:text-zinc-400 transition-colors">
                            {showAccounts ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Accounts
                        </button>
                        {showAccounts && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                                {byAccount.map(item => (
                                    isManagingAccounts ? (
                                        <AccountCardEditable key={item.account.id} account={item.account} balance={item.balance}
                                            isEditing={editingAccountId === item.account.id}
                                            onEdit={() => setEditingAccountId(item.account.id)}
                                            onCancelEdit={() => setEditingAccountId(null)}
                                            onUpdate={onUpdateAccount} onDelete={onDeleteAccount} currency={currency} />
                                    ) : (
                                        <AccountCard key={item.account.id} account={item.account} balance={item.balance} currency={currency} />
                                    )
                                ))}
                                {isManagingAccounts && <AddAccountForm onAdd={onAddAccount} />}
                            </div>
                        )}
                    </div>
                )}
                {state.accounts.length === 0 && (
                    <div className="mb-4">
                        <AddAccountForm onAdd={onAddAccount} />
                    </div>
                )}

                {/* Running Balance Table */}
                <div className="text-[10px] font-mono text-zinc-600 uppercase mb-2">
                    {filteredTxs.length} entries
                </div>

                <div className="border border-zinc-800/60 rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="hidden md:grid px-4 py-2 text-[9px] font-mono text-zinc-600 uppercase tracking-widest border-b border-zinc-800 bg-zinc-900/50"
                        style={{ gridTemplateColumns: gridTemplate }}>
                        {activeCols.map(col => {
                            const def = COL_DEFS.find(c => c.id === col)!;
                            return <span key={col} className={def.align === 'right' ? 'text-right' : ''}>{def.label}</span>;
                        })}
                    </div>

                    {/* Starting Balance Row */}
                    <div className="hidden md:grid px-4 py-2 border-b border-zinc-800/60 bg-zinc-900/20"
                        style={{ gridTemplateColumns: gridTemplate }}>
                        {activeCols.map(col => {
                            if (col === 'description') return <span key={col} className="text-zinc-600 text-xs font-mono italic">Starting Balance</span>;
                            if (col === 'balance') return <span key={col} className={`text-xs font-mono text-right ${startingBalance >= 0 ? 'text-zinc-500' : 'text-red-400'}`}>{fmtCurrency(startingBalance, currency)}</span>;
                            return <span key={col} />;
                        })}
                    </div>

                    {/* Month Groups */}
                    {monthGroups.length === 0 && (
                        <div className="py-12 text-center text-zinc-600 text-sm">No transactions in this period</div>
                    )}
                    {monthGroups.map(({ key: monthKey, txs: monthTxs }) => {
                        const monthIn = monthTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
                        const monthOut = Math.abs(monthTxs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
                        const monthNet = monthIn - monthOut;
                        return (
                            <div key={monthKey}>
                                {/* Month Header */}
                                <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-900/50 border-b border-zinc-800/60 sticky top-0 z-10">
                                    <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">{monthKey}</span>
                                    <span className="text-[9px] text-emerald-700 font-mono">+{fmtCurrency(monthIn, currency)}</span>
                                    <span className="text-[9px] text-zinc-700 font-mono">−{fmtCurrency(monthOut, currency)}</span>
                                    <span className={`text-[9px] font-mono ml-auto ${monthNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        net {monthNet >= 0 ? '+' : ''}{fmtCurrency(monthNet, currency)}
                                    </span>
                                </div>
                                {/* Transaction Rows */}
                                {monthTxs.map(tx => {
                                    const isEditing = inlineEditId === tx.id;
                                    const cat = state.financeCategories.find(c => c.id === tx.category || c.name === tx.category);
                                    const acc = state.accounts.find(a => a.id === tx.accountId);
                                    return (
                                        <div key={tx.id} className="group border-b border-zinc-900/80">
                                            {/* Desktop Row — dynamic grid */}
                                            <div className="hidden md:grid px-4 py-2.5 hover:bg-zinc-900/30 transition-colors items-center"
                                                style={{ gridTemplateColumns: gridTemplate }}>
                                                {activeCols.map(col => {
                                                    if (col === 'date') return (
                                                        <span key={col} className="text-[11px] text-zinc-500 font-mono">{fmtDate(tx.date)}</span>
                                                    );
                                                    if (col === 'description') return (
                                                        <div key={col} className="flex items-center gap-1 min-w-0">
                                                            {isEditing ? (
                                                                <input autoFocus value={inlineEdit.description || ''}
                                                                    onChange={e => setInlineEdit(prev => ({ ...prev, description: e.target.value }))}
                                                                    onKeyDown={e => { if (e.key === 'Enter') saveInlineEdit(); if (e.key === 'Escape') setInlineEditId(null); }}
                                                                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-sm text-zinc-200 outline-none w-full font-medium" />
                                                            ) : (
                                                                <span onClick={() => startInlineEdit(tx)}
                                                                    className="text-sm text-zinc-100 font-medium cursor-text hover:text-white truncate">
                                                                    {tx.description || <span className="text-zinc-600 italic">no description</span>}
                                                                </span>
                                                            )}
                                                            <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                                                <button onClick={() => startInlineEdit(tx)} className="p-0.5 text-zinc-600 hover:text-zinc-400"><Edit2 size={10} /></button>
                                                                <button onClick={() => onDeleteTransaction(tx.id)} className="p-0.5 text-zinc-700 hover:text-red-400"><Trash2 size={10} /></button>
                                                            </div>
                                                        </div>
                                                    );
                                                    if (col === 'category') return (
                                                        <div key={col}>
                                                            {isEditing ? (
                                                                <input value={inlineEdit.category || ''}
                                                                    onChange={e => setInlineEdit(prev => ({ ...prev, category: e.target.value }))}
                                                                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-300 outline-none w-full font-mono" />
                                                            ) : (
                                                                <span className="text-[10px] font-mono text-zinc-500">
                                                                    {cat ? `${cat.icon} ${cat.name}` : tx.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                    if (col === 'account') return (
                                                        <span key={col} className="text-[10px] text-zinc-600 font-mono">{acc?.name || '—'}</span>
                                                    );
                                                    if (col === 'fees') return (
                                                        <span key={col} className="text-xs font-mono text-zinc-700 text-right block">
                                                            {tx.fees ? fmtCurrency(tx.fees) : '—'}
                                                        </span>
                                                    );
                                                    if (col === 'in') return (
                                                        <div key={col} className="text-right">
                                                            {tx.amount > 0 && <span className="text-sm font-mono font-semibold text-emerald-400">{fmtCurrency(tx.amount, currency)}</span>}
                                                        </div>
                                                    );
                                                    if (col === 'out') return (
                                                        <div key={col} className="text-right">
                                                            {tx.amount < 0 && <span className="text-sm font-mono text-zinc-400">{fmtCurrency(Math.abs(tx.amount), currency)}</span>}
                                                        </div>
                                                    );
                                                    if (col === 'balance') return (
                                                        <div key={col} className="text-right">
                                                            <span className={`text-sm font-mono font-bold ${(tx as any).runningBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
                                                                {fmtCurrency((tx as any).runningBalance, currency)}
                                                            </span>
                                                        </div>
                                                    );
                                                    if (col === 'notes') return (
                                                        <div key={col} className="text-right flex items-center justify-end gap-1">
                                                            {isEditing ? (
                                                                <>
                                                                    <input value={inlineEdit.notes || ''}
                                                                        onChange={e => setInlineEdit(prev => ({ ...prev, notes: e.target.value }))}
                                                                        placeholder="notes..."
                                                                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-300 outline-none flex-1 font-mono" />
                                                                    <button onClick={saveInlineEdit} className="text-emerald-500 hover:text-emerald-400 p-1"><Check size={12} /></button>
                                                                    <button onClick={() => setInlineEditId(null)} className="text-zinc-600 hover:text-zinc-400 p-1"><X size={12} /></button>
                                                                </>
                                                            ) : (
                                                                <span className="text-[11px] text-zinc-600 font-mono truncate max-w-[120px]">{tx.notes || ''}</span>
                                                            )}
                                                        </div>
                                                    );
                                                    return null;
                                                })}
                                            </div>
                                            {/* Mobile Row */}
                                            <div className="md:hidden px-4 py-3 hover:bg-zinc-900/30 transition-colors">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-zinc-100 font-medium truncate">{tx.description}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-zinc-600 font-mono">{fmtDate(tx.date)}</span>
                                                            <span className="text-[10px] text-zinc-600">{cat ? `${cat.icon} ${cat.name}` : tx.category}</span>
                                                            {acc && <span className="text-[10px] text-zinc-700">{acc.name}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className={`text-sm font-mono font-semibold ${tx.amount > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                                            {tx.amount > 0 ? '+' : ''}{fmtCurrency(tx.amount, currency)}
                                                        </div>
                                                        <div className={`text-[10px] font-mono font-bold ${(tx as any).runningBalance >= 0 ? 'text-zinc-300' : 'text-red-400'}`}>
                                                            {fmtCurrency((tx as any).runningBalance, currency)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => startInlineEdit(tx)} className="text-zinc-600 hover:text-zinc-400 p-1"><Edit2 size={11} /></button>
                                                    <button onClick={() => onDeleteTransaction(tx.id)} className="text-zinc-700 hover:text-red-400 p-1"><Trash2 size={11} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {/* Closing Balance Row */}
                    <div className="hidden md:grid px-4 py-3 border-t-2 border-zinc-700/50 bg-zinc-900/30"
                        style={{ gridTemplateColumns: gridTemplate }}>
                        {activeCols.map(col => {
                            if (col === 'description') return <span key={col} className="text-zinc-300 text-xs font-mono font-semibold">Closing Balance</span>;
                            if (col === 'balance') return <span key={col} className={`text-sm font-mono font-bold text-right block ${closingBalance >= 0 ? 'text-white' : 'text-red-400'}`}>{fmtCurrency(closingBalance, currency)}</span>;
                            return <span key={col} />;
                        })}
                    </div>
                </div>

                {/* ── Forecast Section (amber / projected) ── */}
                <div className="mt-5 mb-8 border border-dashed border-amber-900/40 rounded-xl overflow-hidden">
                    <div className="bg-amber-950/20 px-4 py-2.5 flex items-center justify-between border-b border-amber-900/30">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={12} className="text-amber-500" />
                            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">Forecast — Projected</span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-800">from {fmtCurrency(closingBalance, currency)}</span>
                    </div>
                    {/* Forecast quick entry */}
                    <div className="px-4 py-2 border-b border-amber-900/20 bg-amber-950/10 flex items-center gap-2">
                        <Zap size={11} className="text-amber-800 shrink-0" />
                        <input value={forecastInput} onChange={e => setForecastInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleForecastQuickSubmit(); }}
                            placeholder="+5000 client payment, −1200 rent next month..."
                            className="flex-1 bg-transparent text-xs text-amber-200/60 placeholder-amber-900/60 outline-none" />
                    </div>
                    {/* Forecast rows */}
                    {state.forecastEntries.length === 0 ? (
                        <div className="py-6 text-center text-amber-900/60 text-xs">No forecast entries. Quick-add above or create from Subscriptions.</div>
                    ) : (
                        (() => {
                            let projBal = closingBalance;
                            return state.forecastEntries
                                .filter(e => filterAccount === 'all' || e.accountId === filterAccount)
                                .sort((a, b) => a.date - b.date)
                                .map(entry => {
                                    projBal += entry.amount;
                                    const thisBal = projBal;
                                    const isIncome = entry.amount > 0;
                                    const STATUS_CLS: Record<ForecastStatus, string> = {
                                        planned: 'text-blue-500', recurring: 'text-emerald-500',
                                        potential: 'text-amber-500', scenario: 'text-purple-500',
                                    };
                                    return (
                                        <div key={entry.id}
                                            className="flex items-center gap-3 px-4 py-2 border-b border-amber-900/15 hover:bg-amber-950/15 transition-colors">
                                            <span className="text-[10px] font-mono text-amber-800/70 w-16 shrink-0">{fmtDate(entry.date)}</span>
                                            <span className="flex-1 text-xs text-amber-200/50 truncate">{entry.description}</span>
                                            <span className={`text-[9px] font-mono shrink-0 ${STATUS_CLS[entry.status]}`}>{entry.status}</span>
                                            <span className={`text-xs font-mono font-semibold w-20 text-right shrink-0 ${isIncome ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                                                {isIncome ? '+' : '−'}{fmtCurrency(Math.abs(entry.amount), currency)}
                                            </span>
                                            <span className={`text-xs font-mono font-bold w-20 text-right shrink-0 ${thisBal >= 0 ? 'text-amber-300' : 'text-red-400'}`}>
                                                {fmtCurrency(thisBal, currency)}
                                            </span>
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => onApproveForecastEntry(entry.id)} title="Convert to real transaction"
                                                    className="p-1 text-amber-800 hover:text-emerald-400 transition-colors"><Check size={11} /></button>
                                                <button onClick={() => onDeleteForecastEntry(entry.id)}
                                                    className="p-1 text-amber-900 hover:text-red-400 transition-colors"><X size={11} /></button>
                                            </div>
                                        </div>
                                    );
                                });
                        })()
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── TRANSACTION MODAL ────────────────────────────────────────────────────────

interface TransactionModalProps {
    state: AppState;
    currency: string;
    preset: Partial<Transaction>;
    onClose: () => void;
    onSubmit: (tx: Transaction) => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ state, currency, preset, onClose, onSubmit }) => {
    const defaultAccountId = state.ledgerSettings?.defaultAccountId || state.accounts[0]?.id || '';
    const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>(preset.type || 'EXPENSE');
    const [amount, setAmount] = useState<number>(preset.amount ? Math.abs(preset.amount) : 0);
    const [amountInput, setAmountInput] = useState(preset.amount ? String(Math.abs(preset.amount)) : '');
    const [description, setDescription] = useState(preset.description || '');
    const [category, setCategory] = useState(preset.category || '');
    const [accountId, setAccountId] = useState(preset.accountId || defaultAccountId);
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState(preset.notes || '');

    const presets = state.ledgerSettings?.amountPresets || [25, 50, 100, 200, 500, 1000];

    const handlePreset = (val: number) => { setAmount(val); setAmountInput(String(val)); };
    const handleNudge = (delta: number) => {
        const next = Math.max(0, amount + delta);
        setAmount(next);
        setAmountInput(String(next));
    };
    const handleAmountInput = (val: string) => {
        setAmountInput(val);
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) setAmount(num);
    };

    const visibleCategories = state.financeCategories.filter(c => {
        if (c.archived) return false;
        if (txType === 'INCOME') return c.type === 'INCOME' || c.type === 'BOTH';
        return c.type === 'EXPENSE' || c.type === 'BOTH';
    }).sort((a, b) => a.order - b.order);

    const handleSubmit = () => {
        if (!amount || amount <= 0) return;
        const ts = new Date(date + 'T12:00:00').getTime();
        onSubmit({
            id: generateId(),
            amount: txType === 'INCOME' ? amount : -amount,
            date: ts,
            description: description.trim() || 'Transaction',
            type: txType,
            category: category || 'Other',
            accountId: accountId || undefined,
            notes: notes.trim() || undefined,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="p-5 space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-zinc-200">Log Transaction</h2>
                        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 p-1"><X size={16} /></button>
                    </div>

                    {/* Sign Toggle */}
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setTxType('INCOME')}
                            className={`py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${txType === 'INCOME' ? 'bg-emerald-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
                            <ArrowUpRight size={16} /> Income
                        </button>
                        <button onClick={() => setTxType('EXPENSE')}
                            className={`py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${txType === 'EXPENSE' ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}>
                            <ArrowDownLeft size={16} /> Expense
                        </button>
                    </div>

                    {/* Amount Display */}
                    <div className="text-center">
                        <div className={`text-5xl font-mono font-bold ${txType === 'INCOME' ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {CURRENCY_SYMBOLS[currency] || '$'}{amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-6 gap-1.5">
                        {presets.map(p => (
                            <button key={p} onClick={() => handlePreset(p)}
                                className={`py-2 rounded-lg text-xs font-mono font-medium transition-colors ${amount === p ? 'bg-zinc-700 text-white border border-zinc-600' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                                {p >= 1000 ? `${p/1000}k` : p}
                            </button>
                        ))}
                    </div>

                    {/* Nudge Buttons + Custom Input */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleNudge(-100)} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-mono rounded-lg transition-colors">-100</button>
                        <button onClick={() => handleNudge(-10)} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-mono rounded-lg transition-colors">-10</button>
                        <input value={amountInput} onChange={e => handleAmountInput(e.target.value)}
                            type="number" min="0" step="0.01" placeholder="0.00"
                            className="flex-[2] py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-sm text-zinc-200 font-mono outline-none focus:border-zinc-500" />
                        <button onClick={() => handleNudge(10)} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-mono rounded-lg transition-colors">+10</button>
                        <button onClick={() => handleNudge(100)} className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-mono rounded-lg transition-colors">+100</button>
                    </div>

                    {/* Category Pad */}
                    <div>
                        <div className="text-[10px] font-mono text-zinc-600 uppercase mb-2">Category</div>
                        <div className="grid grid-cols-4 md:grid-cols-5 gap-1.5 max-h-40 overflow-y-auto">
                            {visibleCategories.map(cat => (
                                <button key={cat.id} onClick={() => setCategory(cat.id)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-mono transition-colors gap-0.5 ${category === cat.id ? 'bg-emerald-900/50 border border-emerald-700 text-emerald-300' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                                    <span className="text-base">{cat.icon}</span>
                                    <span className="truncate w-full text-center leading-tight">{cat.name.split(' ')[0]}</span>
                                </button>
                            ))}
                            <button onClick={() => setCategory('custom')}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-mono transition-colors gap-0.5 ${category === 'custom' ? 'bg-zinc-700 border border-zinc-600 text-zinc-200' : 'bg-zinc-900 border border-zinc-800 border-dashed text-zinc-600 hover:text-zinc-400'}`}>
                                <span className="text-base">🏷️</span>
                                <span>Custom</span>
                            </button>
                        </div>
                    </div>

                    {/* Description */}
                    <input value={description} onChange={e => setDescription(e.target.value)}
                        placeholder="Description..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-zinc-600" />

                    {/* Account + Date row */}
                    <div className="grid grid-cols-2 gap-2">
                        <select value={accountId} onChange={e => setAccountId(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-zinc-600">
                            <option value="">No Account</option>
                            {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-zinc-600" />
                    </div>

                    {/* Notes */}
                    <input value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Notes (optional)..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400 outline-none focus:border-zinc-600" />

                    {/* Submit */}
                    <button onClick={handleSubmit} disabled={!amount || amount <= 0}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black hover:bg-zinc-200">
                        Log Transaction
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── FORECAST TAB ─────────────────────────────────────────────────────────────

interface ForecastTabProps extends Props { currency: string; }

const ForecastTab: React.FC<ForecastTabProps> = ({ state, currency, onAddForecastEntry, onUpdateForecastEntry, onDeleteForecastEntry, onApproveForecastEntry }) => {
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ description: '', amount: '', type: 'EXPENSE' as 'INCOME' | 'EXPENSE', category: '', date: new Date().toISOString().split('T')[0], status: 'planned' as ForecastStatus, notes: '' });

    const entries = [...state.forecastEntries].sort((a, b) => a.date - b.date);

    const STATUS_STYLE: Record<ForecastStatus, string> = {
        planned: 'text-blue-400 bg-blue-900/30 border-blue-800',
        recurring: 'text-emerald-400 bg-emerald-900/30 border-emerald-800',
        potential: 'text-amber-400 bg-amber-900/30 border-amber-800',
        scenario: 'text-purple-400 bg-purple-900/30 border-purple-800',
    };

    const handleAdd = () => {
        const amt = parseFloat(form.amount);
        if (!amt || !form.description) return;
        onAddForecastEntry({
            id: generateId(),
            amount: form.type === 'INCOME' ? amt : -amt,
            date: new Date(form.date + 'T12:00:00').getTime(),
            description: form.description,
            type: form.type,
            category: form.category || 'Other',
            status: form.status,
            notes: form.notes || undefined,
        });
        setForm({ description: '', amount: '', type: 'EXPENSE', category: '', date: new Date().toISOString().split('T')[0], status: 'planned', notes: '' });
        setShowAdd(false);
    };

    const currentBal = state.transactions.reduce((s, t) => s + t.amount, 0);
    const plannedBal = currentBal + entries.filter(e => e.status === 'planned' || e.status === 'recurring').reduce((s, e) => s + e.amount, 0);
    const potentialBal = plannedBal + entries.filter(e => e.status === 'potential').reduce((s, e) => s + e.amount, 0);

    return (
        <div className="h-full overflow-auto px-4 md:px-6 py-4">
            {/* Balance Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { label: 'Current', val: currentBal, color: 'text-zinc-200' },
                    { label: 'Planned', val: plannedBal, color: 'text-emerald-400' },
                    { label: 'Potential', val: potentialBal, color: 'text-amber-400' },
                ].map(({ label, val, color }) => (
                    <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                        <div className="text-[10px] font-mono text-zinc-600 uppercase mb-1">{label}</div>
                        <div className={`text-lg font-mono font-medium ${color}`}>{fmtCurrency(val, currency)}</div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-mono text-zinc-600 uppercase">Forecast Entries</div>
                <button onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors">
                    <Plus size={12} /> Add Entry
                </button>
            </div>

            {showAdd && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Description" className="col-span-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 outline-none" />
                        <div className="flex gap-1">
                            {(['INCOME', 'EXPENSE'] as const).map(t => (
                                <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                                    className={`flex-1 py-1.5 text-xs font-mono rounded transition-colors ${form.type === t ? (t === 'INCOME' ? 'bg-emerald-700 text-white' : 'bg-zinc-700 text-white') : 'bg-zinc-800 text-zinc-500'}`}>
                                    {t === 'INCOME' ? '+' : '−'}
                                </button>
                            ))}
                        </div>
                        <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                            placeholder="Amount" type="number" min="0"
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none font-mono" />
                        <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none" />
                        <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as ForecastStatus }))}
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none">
                            <option value="planned">Planned</option>
                            <option value="potential">Potential</option>
                            <option value="scenario">Scenario</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAdd} className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200 transition-colors">Add</button>
                        <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded hover:bg-zinc-700 transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {entries.length === 0 && <div className="text-center py-12 text-zinc-600 text-sm">No forecast entries</div>}

            <div className="space-y-1.5">
                {entries.map(entry => {
                    const cat = state.financeCategories.find(c => c.id === entry.category);
                    return (
                        <div key={entry.id} className="group flex items-center gap-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-4 py-3 hover:bg-zinc-900 transition-colors">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-zinc-200 font-medium truncate">{entry.description}</span>
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${STATUS_STYLE[entry.status]}`}>{entry.status}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-zinc-600 font-mono">{fmtDate(entry.date)}</span>
                                    <span className="text-[10px] text-zinc-600 font-mono">{cat ? `${cat.icon} ${cat.name}` : entry.category}</span>
                                </div>
                            </div>
                            <div className={`text-sm font-mono font-medium shrink-0 ${entry.amount > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                {entry.amount > 0 ? '+' : ''}{fmtCurrency(entry.amount, currency)}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => onApproveForecastEntry(entry.id)} title="Approve — convert to transaction"
                                    className="p-1.5 text-emerald-600 hover:text-emerald-400 hover:bg-emerald-900/20 rounded transition-colors">
                                    <Check size={13} />
                                </button>
                                <button onClick={() => onDeleteForecastEntry(entry.id)} title="Skip"
                                    className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors">
                                    <X size={13} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── SUBSCRIPTIONS TAB ────────────────────────────────────────────────────────

interface SubsTabProps extends Props { currency: string; }

const SubscriptionsTab: React.FC<SubsTabProps> = ({ state, currency, onAddRecurringRule, onUpdateRecurringRule, onDeleteRecurringRule }) => {
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({
        description: '', amount: '', type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
        frequency: 'monthly' as RecurringFrequency, category: '', accountId: '',
        startDate: new Date().toISOString().split('T')[0], notes: ''
    });

    const subs = state.recurringRules.filter(r => r.isSubscription);
    const activeSubs = subs.filter(r => r.active);
    const monthlyActive = activeSubs.reduce((s, r) => s + getMonthlyAmount(r), 0);
    const monthlyAll = subs.reduce((s, r) => s + getMonthlyAmount(r), 0);

    const handleAdd = () => {
        const amt = parseFloat(form.amount);
        if (!amt || !form.description) return;
        onAddRecurringRule({
            id: generateId(),
            description: form.description,
            amount: amt,
            type: form.type,
            category: form.category || 'Subscriptions',
            accountId: form.accountId || undefined,
            frequency: form.frequency,
            startDate: new Date(form.startDate + 'T12:00:00').getTime(),
            active: true,
            notes: form.notes || undefined,
            isSubscription: true,
        });
        setForm({ description: '', amount: '', type: 'EXPENSE', frequency: 'monthly', category: '', accountId: '', startDate: new Date().toISOString().split('T')[0], notes: '' });
        setShowAdd(false);
    };

    const FREQ_LABELS: Record<RecurringFrequency, string> = {
        daily: 'Daily', weekly: 'Weekly', biweekly: 'Bi-weekly',
        monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly'
    };

    return (
        <div className="h-full overflow-auto px-4 md:px-6 py-4">
            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="text-[10px] font-mono text-zinc-600 uppercase mb-1">Active Monthly Cost</div>
                    <div className="text-2xl font-mono font-semibold text-zinc-200">{fmtCurrency(monthlyActive, currency)}</div>
                    <div className="text-[11px] text-zinc-600 font-mono mt-1">/ year: {fmtCurrency(monthlyActive * 12, currency)}</div>
                </div>
                <div className="col-span-2 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-lg p-4">
                    <div className="text-[10px] font-mono text-zinc-600 uppercase mb-1">If All Active</div>
                    <div className="text-2xl font-mono font-semibold text-zinc-500">{fmtCurrency(monthlyAll, currency)}</div>
                    <div className="text-[11px] text-zinc-600 font-mono mt-1">/ year: {fmtCurrency(monthlyAll * 12, currency)}</div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-mono text-zinc-600 uppercase">{subs.length} subscriptions</div>
                <button onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-zinc-400 hover:bg-zinc-800 transition-colors">
                    <Plus size={12} /> Add Subscription
                </button>
            </div>

            {showAdd && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Name (e.g. Netflix)" className="col-span-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 outline-none" />
                        <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                            placeholder="Amount" type="number" min="0"
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none font-mono" />
                        <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value as RecurringFrequency }))}
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none">
                            {(['monthly', 'weekly', 'biweekly', 'quarterly', 'yearly'] as RecurringFrequency[]).map(f => (
                                <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                            ))}
                        </select>
                        <select value={form.accountId} onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none">
                            <option value="">No account</option>
                            {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAdd} className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200 transition-colors">Add</button>
                        <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded hover:bg-zinc-700 transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {subs.length === 0 && <div className="text-center py-12 text-zinc-600 text-sm">No subscriptions yet</div>}

            <div className="space-y-1.5">
                {subs.map(rule => {
                    const cat = state.financeCategories.find(c => c.id === rule.category || c.name === rule.category);
                    const acct = state.accounts.find(a => a.id === rule.accountId);
                    const monthly = getMonthlyAmount(rule);
                    return (
                        <div key={rule.id} className={`group flex items-center gap-3 border rounded-lg px-4 py-3 transition-colors ${rule.active ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-950 border-zinc-900 opacity-60'}`}>
                            <button onClick={() => onUpdateRecurringRule(rule.id, { active: !rule.active })}
                                className={`shrink-0 transition-colors ${rule.active ? 'text-emerald-500 hover:text-emerald-400' : 'text-zinc-700 hover:text-zinc-500'}`}>
                                {rule.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-zinc-200 font-medium">{rule.description}</span>
                                    {cat && <span className="text-xs">{cat.icon}</span>}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-zinc-600 font-mono">{FREQ_LABELS[rule.frequency]}</span>
                                    {acct && <span className="text-[10px] text-zinc-600 font-mono">{acct.name}</span>}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-sm font-mono text-zinc-300">{fmtCurrency(rule.amount, currency)}</div>
                                {rule.frequency !== 'monthly' && (
                                    <div className="text-[10px] text-zinc-600 font-mono">{fmtCurrency(monthly, currency)}/mo</div>
                                )}
                            </div>
                            <button onClick={() => { if (window.confirm(`Delete "${rule.description}"?`)) onDeleteRecurringRule(rule.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-700 hover:text-red-400 transition-all">
                                <Trash2 size={13} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── OBLIGATIONS TAB ──────────────────────────────────────────────────────────

interface ObligationsTabProps extends Props { currency: string; }

const ObligationsTab: React.FC<ObligationsTabProps> = ({ state, currency, onAddObligation, onUpdateObligation, onDeleteObligation }) => {
    const [showAdd, setShowAdd] = useState(false);
    const [showSettled, setShowSettled] = useState(false);
    const [form, setForm] = useState({
        type: 'OWED_TO_ME' as ObligationType,
        description: '', amount: '', entityName: '',
        dueDate: '', notes: ''
    });

    const TYPE_LABELS: Record<ObligationType, string> = {
        OWED_TO_ME: 'They Owe Me',
        I_OWE: 'I Owe',
        ITEM_BORROWED: 'Borrowed',
        ITEM_LENT: 'Lent',
        SERVICE_OWED: 'Service Owed',
    };

    const handleAdd = () => {
        if (!form.description) return;
        onAddObligation({
            id: generateId(),
            type: form.type,
            description: form.description,
            amount: form.amount ? parseFloat(form.amount) : undefined,
            entityName: form.entityName || undefined,
            date: Date.now(),
            dueDate: form.dueDate ? new Date(form.dueDate + 'T12:00:00').getTime() : undefined,
            settled: false,
            notes: form.notes || undefined,
        });
        setForm({ type: 'OWED_TO_ME', description: '', amount: '', entityName: '', dueDate: '', notes: '' });
        setShowAdd(false);
    };

    const activeObs = state.obligations.filter(o => !o.settled);
    const settledObs = state.obligations.filter(o => o.settled);

    const netPosition = activeObs.reduce((sum, o) => {
        if (!o.amount) return sum;
        if (o.type === 'OWED_TO_ME') return sum + o.amount;
        if (o.type === 'I_OWE') return sum - o.amount;
        return sum;
    }, 0);

    const GROUPS: { types: ObligationType[]; label: string }[] = [
        { types: ['OWED_TO_ME'], label: 'They Owe Me' },
        { types: ['I_OWE'], label: 'I Owe' },
        { types: ['ITEM_BORROWED', 'ITEM_LENT', 'SERVICE_OWED'], label: 'Borrowed / Lent / Services' },
    ];

    return (
        <div className="h-full overflow-auto px-4 md:px-6 py-4">
            {/* Net Position */}
            {activeObs.some(o => o.amount) && (
                <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-lg p-3 mb-5 flex items-center gap-3">
                    <AlertCircle size={14} className="text-zinc-600 shrink-0" />
                    <div>
                        <div className="text-[10px] font-mono text-zinc-600 uppercase">Informational — If All Resolved</div>
                        <div className={`text-sm font-mono font-medium ${netPosition >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            Net {netPosition >= 0 ? '+' : ''}{fmtCurrency(netPosition, currency)} to your balance
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-mono text-zinc-600 uppercase">{activeObs.length} active obligations</div>
                <button onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-zinc-400 hover:bg-zinc-800 transition-colors">
                    <Plus size={12} /> Add
                </button>
            </div>

            {showAdd && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4 space-y-3">
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as ObligationType }))}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 outline-none">
                        {(Object.entries(TYPE_LABELS) as [ObligationType, string][]).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                        <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder="Description" className="col-span-2 bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none" />
                        <input value={form.entityName} onChange={e => setForm(p => ({ ...p, entityName: e.target.value }))}
                            placeholder="Person / Entity" className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none" />
                        <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                            placeholder="Amount (optional)" type="number" min="0"
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none font-mono" />
                        <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none"
                            placeholder="Due date (optional)" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAdd} className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200 transition-colors">Add</button>
                        <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs rounded hover:bg-zinc-700 transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {GROUPS.map(group => {
                const groupObs = activeObs.filter(o => group.types.includes(o.type));
                if (groupObs.length === 0) return null;
                return (
                    <div key={group.label} className="mb-6">
                        <div className="text-[10px] font-mono text-zinc-600 uppercase mb-2">{group.label}</div>
                        <div className="space-y-1.5">
                            {groupObs.map(ob => (
                                <div key={ob.id} className="group flex items-center gap-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-4 py-3 hover:bg-zinc-900 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-zinc-200 font-medium">{ob.description}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {ob.entityName && <span className="text-[10px] text-zinc-500 font-mono">{ob.entityName}</span>}
                                            {ob.dueDate && (
                                                <span className={`text-[10px] font-mono ${ob.dueDate < Date.now() ? 'text-red-500' : 'text-zinc-600'}`}>
                                                    due {fmtDate(ob.dueDate)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {ob.amount && (
                                        <span className="text-sm font-mono text-zinc-300 shrink-0">{fmtCurrency(ob.amount, currency)}</span>
                                    )}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => onUpdateObligation(ob.id, { settled: true, settledDate: Date.now() })}
                                            className="p-1.5 text-emerald-600 hover:text-emerald-400 hover:bg-emerald-900/20 rounded transition-colors" title="Mark Settled">
                                            <CheckCircle size={13} />
                                        </button>
                                        <button onClick={() => onDeleteObligation(ob.id)}
                                            className="p-1.5 text-zinc-700 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {activeObs.length === 0 && !showAdd && (
                <div className="text-center py-12 text-zinc-600 text-sm">No active obligations</div>
            )}

            {settledObs.length > 0 && (
                <div className="mt-4">
                    <button onClick={() => setShowSettled(v => !v)}
                        className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-600 uppercase hover:text-zinc-400 transition-colors mb-2">
                        {showSettled ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {settledObs.length} settled
                    </button>
                    {showSettled && (
                        <div className="space-y-1.5">
                            {settledObs.map(ob => (
                                <div key={ob.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 rounded-lg px-4 py-2.5 opacity-50">
                                    <CheckCircle size={13} className="text-emerald-700 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm text-zinc-400 line-through">{ob.description}</span>
                                        {ob.entityName && <span className="text-[10px] text-zinc-600 font-mono ml-2">{ob.entityName}</span>}
                                    </div>
                                    {ob.amount && <span className="text-sm font-mono text-zinc-600">{fmtCurrency(ob.amount, currency)}</span>}
                                    <button onClick={() => onDeleteObligation(ob.id)} className="text-zinc-800 hover:text-zinc-600 p-1"><Trash2 size={11} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── ANALYTICS TAB ────────────────────────────────────────────────────────────

interface AnalyticsTabProps extends Props { currency: string; }

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ state, currency }) => {
    const [analyticsRange, setAnalyticsRange] = useState<DateRange>('this-year');

    const { start: rangeStart, end: rangeEnd } = getDateRangeBounds(analyticsRange);

    const rangedTxs = state.transactions.filter(t => t.date >= rangeStart && t.date <= rangeEnd);

    // Monthly breakdown (last 6 months always shown)
    const monthlyData = useMemo(() => {
        const now = new Date();
        const months: { label: string; income: number; expense: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const start = d.getTime();
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
            const label = d.toLocaleDateString('en-US', { month: 'short' });
            const mTxs = state.transactions.filter(t => t.date >= start && t.date <= end);
            months.push({
                label,
                income: mTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
                expense: Math.abs(mTxs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
            });
        }
        return months;
    }, [state.transactions]);

    const maxBarValue = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 1);

    // Category breakdown
    const categoryData = useMemo(() => {
        const map: Record<string, { name: string; icon: string; amount: number }> = {};
        rangedTxs.filter(t => t.amount < 0).forEach(tx => {
            const cat = state.financeCategories.find(c => c.id === tx.category || c.name === tx.category);
            const key = cat?.id || tx.category || 'other';
            const name = cat?.name || tx.category || 'Other';
            const icon = cat?.icon || '❓';
            if (!map[key]) map[key] = { name, icon, amount: 0 };
            map[key].amount += Math.abs(tx.amount);
        });
        return Object.values(map).sort((a, b) => b.amount - a.amount).slice(0, 10);
    }, [rangedTxs, state.financeCategories]);

    const totalExpense = categoryData.reduce((s, c) => s + c.amount, 0);

    const totalIncome = rangedTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalOut = rangedTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const net = totalIncome - totalOut;

    const byAccount = useMemo(() => {
        const map: Record<string, { account: Account; balance: number }> = {};
        state.accounts.forEach(acc => { map[acc.id] = { account: acc, balance: 0 }; });
        state.transactions.forEach(tx => {
            if (tx.accountId && map[tx.accountId]) map[tx.accountId].balance += tx.amount;
        });
        return Object.values(map).sort((a, b) => b.balance - a.balance);
    }, [state.accounts, state.transactions]);

    return (
        <div className="h-full overflow-auto px-4 md:px-6 py-4 space-y-6">
            {/* Summary */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="text-[10px] font-mono text-zinc-600 uppercase">Summary</div>
                    <div className="flex gap-1 ml-auto">
                        {(['this-month', 'last-3-months', 'this-year', 'all'] as DateRange[]).map(r => (
                            <button key={r} onClick={() => setAnalyticsRange(r)}
                                className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${analyticsRange === r ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900'}`}>
                                {r === 'this-month' ? 'Mo' : r === 'last-3-months' ? '3M' : r === 'this-year' ? 'Yr' : 'All'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                        <div className="text-[10px] text-zinc-600 font-mono uppercase mb-1">Income</div>
                        <div className="text-lg font-mono text-emerald-400">{fmtCurrency(totalIncome, currency)}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                        <div className="text-[10px] text-zinc-600 font-mono uppercase mb-1">Expenses</div>
                        <div className="text-lg font-mono text-zinc-400">{fmtCurrency(totalOut, currency)}</div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                        <div className="text-[10px] text-zinc-600 font-mono uppercase mb-1">Net</div>
                        <div className={`text-lg font-mono ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{net >= 0 ? '+' : ''}{fmtCurrency(net, currency)}</div>
                    </div>
                </div>
            </div>

            {/* Monthly Chart */}
            <div>
                <div className="text-[10px] font-mono text-zinc-600 uppercase mb-3">Last 6 Months</div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-end gap-3 h-28">
                        {monthlyData.map(m => (
                            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex gap-0.5 items-end h-20">
                                    <div className="flex-1 bg-emerald-900/60 rounded-t"
                                        style={{ height: `${Math.max(2, (m.income / maxBarValue) * 100)}%` }} />
                                    <div className="flex-1 bg-zinc-700 rounded-t"
                                        style={{ height: `${Math.max(2, (m.expense / maxBarValue) * 100)}%` }} />
                                </div>
                                <div className="text-[9px] font-mono text-zinc-600">{m.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-zinc-600">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-900/60 rounded inline-block" /> Income</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-zinc-700 rounded inline-block" /> Expenses</span>
                    </div>
                </div>
            </div>

            {/* Category Breakdown */}
            {categoryData.length > 0 && (
                <div>
                    <div className="text-[10px] font-mono text-zinc-600 uppercase mb-3">Spending by Category</div>
                    <div className="space-y-2">
                        {categoryData.map(cat => {
                            const pct = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                            return (
                                <div key={cat.name}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] text-zinc-300 font-mono flex items-center gap-1.5">
                                            <span>{cat.icon}</span> {cat.name}
                                        </span>
                                        <div className="text-right">
                                            <span className="text-[11px] text-zinc-400 font-mono">{fmtCurrency(cat.amount, currency)}</span>
                                            <span className="text-[10px] text-zinc-600 font-mono ml-2">{pct.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-zinc-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Account Balances */}
            {byAccount.length > 0 && (
                <div>
                    <div className="text-[10px] font-mono text-zinc-600 uppercase mb-3">Account Balances</div>
                    <div className="space-y-1.5">
                        {byAccount.map(({ account, balance }) => (
                            <div key={account.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5">
                                <div>
                                    <div className="text-sm text-zinc-300 font-medium">{account.name}</div>
                                    <div className="text-[10px] text-zinc-600 font-mono uppercase">{account.type}</div>
                                </div>
                                <div className={`text-sm font-mono font-medium ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {fmtCurrency(balance, currency)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────

interface SettingsTabProps extends Props {}

const LedgerSettingsTab: React.FC<SettingsTabProps> = ({ state, onUpdateLedgerSettings, onAddCategory, onUpdateCategory, onDeleteCategory, onAddAccount }) => {
    const [presets, setPresets] = useState<number[]>(state.ledgerSettings?.amountPresets || [25, 50, 100, 200, 500, 1000]);
    const [newCatForm, setNewCatForm] = useState({ name: '', icon: '💰', type: 'EXPENSE' as 'INCOME' | 'EXPENSE' | 'BOTH' });
    const [defaultAcct, setDefaultAcct] = useState(state.ledgerSettings?.defaultAccountId || '');

    const handleSavePresets = () => {
        onUpdateLedgerSettings({ amountPresets: presets });
    };

    const handleAddCategory = () => {
        if (!newCatForm.name.trim()) return;
        onAddCategory({
            id: generateId(),
            name: newCatForm.name.trim(),
            icon: newCatForm.icon,
            type: newCatForm.type,
            order: state.financeCategories.length + 1,
            archived: false,
        });
        setNewCatForm({ name: '', icon: '💰', type: 'EXPENSE' });
    };

    const activePresetId = ((state.ledgerSettings?.tablePreset as TablePresetId) || 'standard');
    const colOverrides = state.ledgerSettings?.columnOverrides || {};

    return (
        <div className="h-full overflow-auto px-4 md:px-6 py-4 space-y-8">

            {/* Table Configuration */}
            <div>
                <div className="text-[10px] font-mono text-zinc-600 uppercase mb-3">Table Layout</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {TABLE_PRESETS.map(p => (
                        <button key={p.id} onClick={() => onUpdateLedgerSettings({ tablePreset: p.id })}
                            className={`p-3 rounded-lg border text-left transition-all ${
                                activePresetId === p.id
                                    ? 'border-emerald-600 bg-emerald-900/20 text-zinc-200'
                                    : 'border-zinc-800 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
                            }`}>
                            <div className="text-xs font-semibold mb-0.5">{p.label}</div>
                            <div className="text-[10px] font-mono">{p.cols.filter(c => c !== 'actions').join(' · ')}</div>
                        </button>
                    ))}
                </div>

                <div className="text-[10px] font-mono text-zinc-600 uppercase mb-2">Column Overrides</div>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
                    {COL_DEFS.filter(c => c.id !== 'description').map(c => {
                        const presetDefault = TABLE_PRESETS.find(p => p.id === activePresetId)?.cols.includes(c.id) ?? false;
                        const isOn = c.id in colOverrides ? colOverrides[c.id] : presetDefault;
                        return (
                            <button key={c.id} onClick={() => {
                                const next = { ...colOverrides, [c.id]: !isOn };
                                onUpdateLedgerSettings({ columnOverrides: next });
                            }}
                                className={`px-2 py-1.5 rounded border text-[10px] font-mono transition-all flex items-center gap-1.5 ${
                                    isOn
                                        ? 'border-zinc-600 bg-zinc-800 text-zinc-300'
                                        : 'border-zinc-800 text-zinc-700 hover:text-zinc-500'
                                }`}>
                                {isOn ? <Eye size={10} /> : <EyeOff size={10} />} {c.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Amount Presets */}
            <div>
                <div className="text-[10px] font-mono text-zinc-600 uppercase mb-3">Amount Picker Presets</div>
                <div className="grid grid-cols-6 gap-2 mb-3">
                    {presets.map((p, i) => (
                        <input key={i} type="number" min="1" value={p}
                            onChange={e => { const next = [...presets]; next[i] = parseFloat(e.target.value) || 0; setPresets(next); }}
                            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-200 outline-none font-mono text-center focus:border-zinc-600 w-full" />
                    ))}
                </div>
                <button onClick={handleSavePresets}
                    className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200 transition-colors">
                    Save Presets
                </button>
            </div>

            {/* Default Account */}
            <div>
                <div className="text-[10px] font-mono text-zinc-600 uppercase mb-3">Default Account</div>
                <div className="flex gap-2">
                    <select value={defaultAcct} onChange={e => setDefaultAcct(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600">
                        <option value="">None</option>
                        {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                    </select>
                    <button onClick={() => onUpdateLedgerSettings({ defaultAccountId: defaultAcct || undefined })}
                        className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-bold rounded hover:bg-zinc-700 transition-colors">
                        Save
                    </button>
                </div>
            </div>

            {/* Category Manager */}
            <div>
                <div className="text-[10px] font-mono text-zinc-600 uppercase mb-3">Finance Categories</div>

                {/* Add Category Form */}
                <div className="flex gap-2 mb-4">
                    <input value={newCatForm.icon} onChange={e => setNewCatForm(p => ({ ...p, icon: e.target.value }))}
                        className="w-12 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-center text-lg outline-none" />
                    <input value={newCatForm.name} onChange={e => setNewCatForm(p => ({ ...p, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                        placeholder="Category name..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600" />
                    <select value={newCatForm.type} onChange={e => setNewCatForm(p => ({ ...p, type: e.target.value as any }))}
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 outline-none">
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                        <option value="BOTH">Both</option>
                    </select>
                    <button onClick={handleAddCategory}
                        className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded hover:bg-zinc-700 transition-colors">
                        <Plus size={12} />
                    </button>
                </div>

                {/* Category List */}
                <div className="space-y-1">
                    {state.financeCategories.sort((a, b) => a.order - b.order).map(cat => (
                        <div key={cat.id} className={`flex items-center gap-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-3 py-2 ${cat.archived ? 'opacity-40' : ''}`}>
                            <span className="text-base">{cat.icon}</span>
                            <span className="text-sm text-zinc-300 flex-1">{cat.name}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                cat.type === 'INCOME' ? 'text-emerald-600 bg-emerald-900/20' :
                                cat.type === 'EXPENSE' ? 'text-zinc-600 bg-zinc-800' :
                                'text-zinc-500 bg-zinc-800'
                            }`}>{cat.type}</span>
                            <button onClick={() => onUpdateCategory(cat.id, { archived: !cat.archived })}
                                className="text-zinc-700 hover:text-zinc-400 p-1 transition-colors" title={cat.archived ? 'Restore' : 'Archive'}>
                                {cat.archived ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                            {!cat.id.startsWith('fc-') && (
                                <button onClick={() => { if (window.confirm(`Delete "${cat.name}"?`)) onDeleteCategory(cat.id); }}
                                    className="text-zinc-800 hover:text-red-400 p-1 transition-colors">
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── ACCOUNT CARDS ────────────────────────────────────────────────────────────

const AccountCard: React.FC<{ account: Account; balance: number; currency: string }> = ({ account, balance, currency }) => (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 hover:bg-zinc-900 transition-colors">
        <div className="flex items-center gap-1.5 mb-2">
            <Wallet size={13} className="text-zinc-600" />
            <span className="text-xs font-medium text-zinc-300">{account.name}</span>
            <span className="text-[9px] font-mono text-zinc-600 uppercase ml-auto">{account.type}</span>
        </div>
        <div className={`text-lg font-mono font-semibold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmtCurrency(balance, currency)}
        </div>
    </div>
);

const AccountCardEditable: React.FC<{
    account: Account; balance: number; currency: string;
    isEditing: boolean; onEdit: () => void; onCancelEdit: () => void;
    onUpdate?: (id: string, updates: Partial<Account>) => void;
    onDelete?: (id: string) => void;
}> = ({ account, balance, currency, isEditing, onEdit, onCancelEdit, onUpdate, onDelete }) => {
    const [editForm, setEditForm] = useState({ name: account.name, type: account.type });

    const handleSave = () => {
        if (onUpdate) onUpdate(account.id, editForm);
        onCancelEdit();
    };

    if (isEditing) {
        return (
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 space-y-2">
                <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-600" placeholder="Account name" />
                <select value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value as AccountType }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-200 outline-none">
                    {(['CASH', 'BANK', 'CRYPTO', 'ASSET'] as AccountType[]).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="flex gap-1.5">
                    <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold rounded transition-colors">
                        <Check size={11} /> Save
                    </button>
                    {onDelete && (
                        <button onClick={() => { if (window.confirm(`Delete "${account.name}"?`)) { onDelete(account.id); onCancelEdit(); } }}
                            className="px-2.5 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 text-xs rounded transition-colors">
                            <Trash2 size={11} />
                        </button>
                    )}
                    <button onClick={onCancelEdit} className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors">
                        <X size={11} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="group bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 transition-all cursor-pointer" onClick={onEdit}>
            <div className="flex items-center gap-1.5 mb-2">
                <Wallet size={13} className="text-zinc-600" />
                <span className="text-xs font-medium text-zinc-300">{account.name}</span>
                <span className="text-[9px] font-mono text-zinc-600 uppercase ml-auto">{account.type}</span>
                <Edit2 size={11} className="opacity-0 group-hover:opacity-100 text-zinc-600 transition-all" />
            </div>
            <div className={`text-lg font-mono font-semibold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtCurrency(balance, currency)}
            </div>
        </div>
    );
};

const AddAccountForm: React.FC<{ onAdd: (account: Account) => void }> = ({ onAdd }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState({ name: '', type: 'BANK' as AccountType });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        onAdd({ id: generateId(), name: form.name.trim(), type: form.type, currency: 'USD' });
        setForm({ name: '', type: 'BANK' });
        setIsAdding(false);
    };

    if (!isAdding) {
        return (
            <button onClick={() => setIsAdding(true)}
                className="flex items-center justify-center gap-1.5 w-full h-full min-h-[72px] border border-dashed border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-colors">
                <Plus size={12} /> Add Account
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 space-y-2">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Account name" autoFocus
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-200 outline-none" />
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as AccountType }))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-200 outline-none">
                {(['CASH', 'BANK', 'CRYPTO', 'ASSET'] as AccountType[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex gap-1.5">
                <button type="submit" disabled={!form.name.trim()}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold rounded transition-colors disabled:opacity-40">
                    Add
                </button>
                <button type="button" onClick={() => setIsAdding(false)}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors">
                    <X size={11} />
                </button>
            </div>
        </form>
    );
};

export default LedgerView;
