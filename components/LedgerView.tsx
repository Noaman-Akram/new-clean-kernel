
import React, { useState, useMemo } from 'react';
import { AppState, Transaction, Category, Account } from '../types';
import { generateId } from '../utils';
import { Plus, CreditCard, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface Props {
  state: AppState;
  onAdd: (tx: Transaction) => void;
}

const LedgerView: React.FC<Props> = ({ state, onAdd }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState(state.accounts[0]?.id || '');

    const handleAdd = (type: 'INCOME' | 'EXPENSE') => {
        const val = parseFloat(amount);
        if(!val || !desc || !accountId) return;
        
        onAdd({
            id: generateId(),
            amount: type === 'INCOME' ? val : -val,
            date: Date.now(),
            description: desc,
            type,
            category: Category.FREELANCE,
            accountId
        });
        setAmount('');
        setDesc('');
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

    const net = state.transactions.reduce((a,b) => a + b.amount, 0);
    const income = state.transactions.filter(t => t.type === 'INCOME').reduce((a,b) => a+b.amount, 0);
    const expense = state.transactions.filter(t => t.type === 'EXPENSE').reduce((a,b) => a+b.amount, 0);

    return (
        <div className="h-full flex flex-col animate-fade-in bg-background">
            
            {/* HEADER SUMMARY */}
            <div className="border-b border-border bg-surface/20 p-10">
                 <div className="flex items-end justify-between mb-8">
                    <div>
                        <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <CreditCard size={14} /> Net Position
                        </div>
                        <div className="text-5xl font-medium text-white tracking-tight font-mono">${net.toLocaleString()}</div>
                    </div>
                    <button 
                        onClick={() => setIsAdding(!isAdding)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md text-xs font-semibold hover:bg-zinc-200 transition-colors"
                    >
                        <Plus size={14} />
                        <span>New Transaction</span>
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 max-w-lg">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4">
                        <div className="text-[10px] text-zinc-500 uppercase mb-1 flex items-center gap-1"><TrendingUp size={12}/> Income</div>
                        <div className="text-xl text-emerald-500 font-mono font-medium">
                            +${income.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4">
                        <div className="text-[10px] text-zinc-500 uppercase mb-1 flex items-center gap-1"><TrendingDown size={12}/> Expenses</div>
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

            {/* TABLE */}
            <div className="flex-1 overflow-auto px-10 py-8 space-y-6">
                <div className="text-[10px] font-mono text-zinc-600 uppercase">Accounts</div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {byAccount.map(item => (
                        <div key={item.account.id} className="bg-surface/40 border border-border rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-white">
                                <Wallet size={14} className="text-zinc-500" />
                                <div className="flex flex-col">
                                    <span className="font-semibold">{item.account.name}</span>
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase">{item.account.type}</span>
                                </div>
                            </div>
                            <div className="text-sm font-mono text-emerald-400">${item.balance.toLocaleString()}</div>
                        </div>
                    ))}
                </div>

                <div className="text-[10px] font-mono text-zinc-600 uppercase mt-4">Recent Activity</div>
                <div className="border-t border-border">
                    <table className="w-full text-left border-collapse">
                        <tbody className="divide-y divide-zinc-800">
                            {state.transactions.map(tx => (
                                <tr key={tx.id} className="group hover:bg-zinc-900/30 transition-colors">
                                    <td className="py-4 text-xs text-zinc-500 font-mono w-40">
                                        {new Date(tx.date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year:'2-digit'})}
                                    </td>
                                    <td className="py-4 text-sm text-zinc-300 font-medium">
                                        {tx.description}
                                    </td>
                                    <td className="py-4 text-right">
                                        <span className="text-[10px] font-mono text-zinc-600 px-2 py-1 rounded bg-zinc-900 uppercase border border-zinc-800">
                                            {tx.category}
                                        </span>
                                    </td>
                                    <td className={`py-4 px-6 text-sm font-mono text-right w-40 ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-zinc-400'}`}>
                                        {tx.type === 'INCOME' ? '+' : ''}{tx.amount}
                                    </td>
                                    <td className="py-4 text-right text-[11px] text-zinc-500 font-mono w-32">
                                        {state.accounts.find(a => a.id === tx.accountId)?.name || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LedgerView;
