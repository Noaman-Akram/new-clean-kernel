import React, { useState, useMemo } from 'react';
import { AppState, Transaction, Category, Account, AccountType } from '../types';
import { generateId } from '../utils';
import { Plus, CreditCard, TrendingUp, TrendingDown, Wallet, Edit2, Check, X, Trash2 } from 'lucide-react';

interface Props {
    state: AppState;
    onAdd: (tx: Transaction) => void;
    onAddAccount?: (account: Account) => void;
    onUpdateAccount?: (id: string, updates: Partial<Account>) => void;
    onDeleteAccount?: (id: string) => void;
    onDeleteTransaction?: (id: string) => void;
}

const LedgerView: React.FC<Props> = ({ state, onAdd, onAddAccount, onUpdateAccount, onDeleteAccount, onDeleteTransaction }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState(state.accounts[0]?.id || '');
    const [category, setCategory] = useState<string>('DEV');
    const [isManagingAccounts, setIsManagingAccounts] = useState(false);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

    const handleAdd = (type: 'INCOME' | 'EXPENSE') => {
        const val = parseFloat(amount);
        if (!val || !desc || !accountId) return;

        onAdd({
            id: generateId(),
            amount: type === 'INCOME' ? val : -val,
            date: Date.now(),
            description: desc,
            type,
            category: category,
            accountId
        });
        setAmount('');
        setDesc('');
        setCategory('DEV');
        setIsAdding(false);
    };

    const byAccount = useMemo(() => {
        const map: Record<string, { account: Account; balance: number }> = {};
        state.accounts.forEach(acc => map[acc.id] = { account: acc, balance: 0 });
        state.transactions.forEach(tx => {
            const key = tx.accountId || state.accounts[0]?.id;
            if (!key || !map[key]) return;
            map[key].balance += tx.amount;
        });
        return Object.values(map);
    }, [state.accounts, state.transactions]);

    const net = state.transactions.reduce((a, b) => a + b.amount, 0);
    const income = state.transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
    const expense = Math.abs(state.transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0));

    return (
        <div className="h-full flex flex-col animate-fade-in bg-background">

            {/* HEADER SUMMARY - COMPACT */}
            <div className="border-b border-border bg-surface/20 p-6">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <CreditCard size={14} /> Net Position
                        </div>
                        <div className="text-4xl font-medium text-white tracking-tight font-mono">${net.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsManagingAccounts(!isManagingAccounts)}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-md text-xs font-bold hover:bg-zinc-800 transition-colors"
                        >
                            <Wallet size={14} />
                            <span>{isManagingAccounts ? 'Done' : 'Manage'}</span>
                        </button>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors"
                        >
                            <Plus size={14} />
                            <span>New Transaction</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-md">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3">
                        <div className="text-[10px] text-zinc-500 uppercase mb-1 flex items-center gap-1"><TrendingUp size={12} /> Income</div>
                        <div className="text-xl text-emerald-500 font-mono font-medium">
                            +${income.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3">
                        <div className="text-[10px] text-zinc-500 uppercase mb-1 flex items-center gap-1"><TrendingDown size={12} /> Expenses</div>
                        <div className="text-xl text-zinc-400 font-mono font-medium">
                            ${expense.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* ADD ROW */}
            {isAdding && (
                <div className="border-b border-border p-4 bg-surface flex items-center justify-center gap-3 animate-fade-in">
                    <input
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder="Description..."
                        className="bg-background border border-border rounded-md px-4 py-2 text-sm text-white focus:border-zinc-500 outline-none w-80"
                        autoFocus
                    />
                    <input
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        placeholder="Category"
                        className="bg-background border border-border rounded-md px-3 py-2 text-sm text-zinc-300 focus:border-zinc-500 outline-none w-32"
                    />
                    <select
                        value={accountId}
                        onChange={e => setAccountId(e.target.value)}
                        className="bg-background border border-border rounded-md px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                    >
                        {state.accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name} · {acc.type}</option>
                        ))}
                    </select>
                    <input
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        type="number"
                        className="bg-background border border-border rounded-md px-4 py-2 text-sm text-white focus:border-zinc-500 outline-none font-mono w-40"
                    />
                    <button onClick={() => handleAdd('INCOME')} className="px-4 py-2 bg-emerald-600 text-white rounded-md text-xs font-bold hover:bg-emerald-500">INCOME</button>
                    <button onClick={() => handleAdd('EXPENSE')} className="px-4 py-2 bg-zinc-700 text-zinc-200 rounded-md text-xs font-bold hover:bg-zinc-600">EXPENSE</button>
                </div>
            )}

            {/* CONTENT */}
            <div className="flex-1 overflow-auto px-6 py-6 space-y-6">

                {/* ACCOUNTS SECTION */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-[10px] font-mono text-zinc-600 uppercase">Accounts</div>
                        {isManagingAccounts && onAddAccount && (
                            <AddAccountForm onAdd={onAddAccount} />
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        {byAccount.map(item => (
                            isManagingAccounts ? (
                                <AccountCardEditable
                                    key={item.account.id}
                                    account={item.account}
                                    balance={item.balance}
                                    isEditing={editingAccountId === item.account.id}
                                    onEdit={() => setEditingAccountId(item.account.id)}
                                    onCancelEdit={() => setEditingAccountId(null)}
                                    onUpdate={onUpdateAccount}
                                    onDelete={onDeleteAccount}
                                />
                            ) : (
                                <AccountCard
                                    key={item.account.id}
                                    account={item.account}
                                    balance={item.balance}
                                />
                            )
                        ))}
                    </div>
                </div>

                {/* TRANSACTIONS TABLE */}
                <div>
                    <div className="text-[10px] font-mono text-zinc-600 uppercase mb-3">Recent Activity</div>
                    <div className="border-t border-border">
                        <table className="w-full text-left border-collapse">
                            <tbody className="divide-y divide-zinc-800">
                                {state.transactions.map(tx => (
                                    <tr key={tx.id} className="group hover:bg-zinc-900/30 transition-colors">
                                        <td className="py-4 text-xs text-zinc-500 font-mono w-32">
                                            {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="py-4 text-sm text-zinc-300 font-medium">
                                            {tx.description}
                                        </td>
                                        <td className="py-4 text-right">
                                            <span className="text-[10px] font-mono text-zinc-600 px-2 py-1 rounded bg-zinc-900 uppercase border border-zinc-800">
                                                {tx.category}
                                            </span>
                                        </td>
                                        <td className={`py-4 px-6 text-sm font-mono text-right w-32 ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                            {tx.type === 'INCOME' ? '+' : ''}{tx.amount.toLocaleString()}
                                        </td>
                                        <td className="py-4 text-right text-[11px] text-zinc-500 font-mono w-32">
                                            {state.accounts.find(a => a.id === tx.accountId)?.name || '—'}
                                        </td>
                                        <td className="py-4 pl-4 pr-0 w-8 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            {onDeleteTransaction && (
                                                <button
                                                    onClick={() => onDeleteTransaction(tx.id)}
                                                    className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors"
                                                    title="Delete Transaction"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple Account Card (Read-only)
const AccountCard: React.FC<{ account: Account; balance: number }> = ({ account, balance }) => (
    <div className="bg-gradient-to-br from-surface/60 to-surface/30 border border-border rounded-xl p-4 hover:shadow-lg transition-all">
        <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <Wallet size={16} className="text-zinc-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">{account.name}</span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">{account.type}</span>
                </div>
            </div>
        </div>
        <div className="text-2xl font-mono font-bold text-emerald-400">${balance.toLocaleString()}</div>
    </div>
);

// Editable Account Card
const AccountCardEditable: React.FC<{
    account: Account;
    balance: number;
    isEditing: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    onUpdate?: (id: string, updates: Partial<Account>) => void;
    onDelete?: (id: string) => void;
}> = ({ account, balance, isEditing, onEdit, onCancelEdit, onUpdate, onDelete }) => {
    const [editForm, setEditForm] = useState({
        name: account.name,
        type: account.type
    });

    const handleSave = () => {
        if (onUpdate) {
            onUpdate(account.id, editForm);
        }
        onCancelEdit();
    };

    if (isEditing) {
        return (
            <div className="bg-surface border border-zinc-700 rounded-xl p-4 space-y-3">
                <input
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
                    placeholder="Account name"
                />
                <select
                    value={editForm.type}
                    onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value as AccountType }))}
                    className="w-full bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
                >
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="CRYPTO">Crypto</option>
                    <option value="ASSET">Asset</option>
                </select>
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded transition-colors"
                    >
                        <Check size={12} /> Save
                    </button>
                    {onDelete && (
                        <button
                            onClick={() => {
                                if (window.confirm(`Delete account "${account.name}"?`)) {
                                    onDelete(account.id);
                                    onCancelEdit();
                                }
                            }}
                            className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 text-xs rounded transition-colors"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                    <button
                        onClick={onCancelEdit}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="group bg-gradient-to-br from-surface/60 to-surface/30 border border-border hover:border-zinc-700 rounded-xl p-4 transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <Wallet size={16} className="text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">{account.name}</span>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">{account.type}</span>
                    </div>
                </div>
                <button
                    onClick={onEdit}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-zinc-300 transition-all"
                >
                    <Edit2 size={14} />
                </button>
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-400">${balance.toLocaleString()}</div>
        </div>
    );
};

// Add Account Form
const AddAccountForm: React.FC<{ onAdd: (account: Account) => void }> = ({ onAdd }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState({
        name: '',
        type: 'BANK' as AccountType
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        onAdd({
            id: generateId(),
            name: form.name.trim(),
            type: form.type,
            currency: 'USD'
        });

        setForm({ name: '', type: 'BANK' });
        setIsAdding(false);
    };

    if (!isAdding) {
        return (
            <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-md text-xs font-mono hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            >
                <Plus size={12} /> Add Account
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Account name"
                className="bg-background border border-zinc-800 rounded px-3 py-1.5 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
                autoFocus
            />
            <select
                value={form.type}
                onChange={e => setForm(prev => ({ ...prev, type: e.target.value as AccountType }))}
                className="bg-background border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
            >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
                <option value="CRYPTO">Crypto</option>
                <option value="ASSET">Asset</option>
            </select>
            <button
                type="submit"
                disabled={!form.name.trim()}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded transition-colors disabled:opacity-50"
            >
                Add
            </button>
            <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded transition-colors"
            >
                <X size={12} />
            </button>
        </form>
    );
};

export default LedgerView;
