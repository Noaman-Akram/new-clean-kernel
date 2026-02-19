import React, { useState } from 'react';
import { Challenge, ChallengeRule } from '../types';
import { X, Plus, Shield, Flame, Trash2, ArrowRight } from 'lucide-react';
import { generateId } from '../utils';

interface Props {
    onStart: (challenge: Challenge) => void;
    onClose: () => void;
}

const ChallengeSetupModal: React.FC<Props> = ({ onStart, onClose }) => {
    const [name, setName] = useState('The Iron Protocol');
    const [duration, setDuration] = useState(30);
    const [rules, setRules] = useState<{ id: string; text: string }[]>([
        { id: generateId(), text: 'Fajr in Masjid' },
        { id: generateId(), text: 'No Sugar / Processed Food' },
        { id: generateId(), text: '4 Hours Deep Work' }
    ]);

    const handleAddRule = () => {
        setRules([...rules, { id: generateId(), text: '' }]);
    };

    const handleUpdateRule = (id: string, text: string) => {
        setRules(rules.map(r => r.id === id ? { ...r, text } : r));
    };

    const handleRemoveRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
    };

    const handleStart = () => {
        if (!name.trim() || rules.some(r => !r.text.trim())) return;

        const newChallenge: Challenge = {
            id: generateId(),
            name,
            startDate: new Date().setHours(0, 0, 0, 0),
            durationDays: duration,
            rules: rules.filter(r => r.text.trim()) as ChallengeRule[],
            history: {},
            status: 'ACTIVE',
            startedAt: Date.now()
        };

        onStart(newChallenge);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-zinc-900 bg-zinc-900/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                            <Flame size={20} className="text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Initiate Protocol</h2>
                            <p className="text-xs text-zinc-500">Define the parameters of your discipline.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">

                    {/* Config */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Protocol Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500/50 focus:outline-none transition-colors placeholder:text-zinc-700"
                                placeholder="Name your challenge..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Duration (Days)</label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Rules */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Shield size={12} />
                                Non-Negotiable Rules
                            </label>
                            <button
                                onClick={handleAddRule}
                                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1 uppercase tracking-widest"
                            >
                                <Plus size={10} /> Add Rule
                            </button>
                        </div>

                        <div className="space-y-2">
                            {rules.map((rule, idx) => (
                                <div key={rule.id} className="flex items-center gap-2 group animate-in slide-in-from-left-2 duration-200" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <span className="text-zinc-600 font-mono text-xs w-4 text-center">{idx + 1}</span>
                                    <input
                                        value={rule.text}
                                        onChange={(e) => handleUpdateRule(rule.id, e.target.value)}
                                        placeholder="e.g. Read 10 pages..."
                                        autoFocus={!rule.text}
                                        className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 focus:border-zinc-600 focus:outline-none focus:bg-zinc-900/50 transition-all placeholder:text-zinc-800"
                                    />
                                    {rules.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveRule(rule.id)}
                                            className="p-2 text-zinc-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-900 bg-zinc-900/30 flex justify-end">
                    <button
                        onClick={handleStart}
                        disabled={!name || rules.some(r => !r.text)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                        Commence Protocol <ArrowRight size={14} />
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ChallengeSetupModal;
