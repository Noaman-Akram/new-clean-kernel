import React, { useMemo } from 'react';
import { Challenge, ChallengeDayStatus, ChallengeRule } from '../types';
import { Check, X, Flame, Shield, Skull, Medal, AlertCircle } from 'lucide-react';
import { DEFAULT_TIME_ZONE, getDateKeyInTimeZone } from '../utils/dateTime';

interface Props {
    challenge: Challenge;
    onUpdateRule: (ruleId: string, completed: boolean) => void;
    onFailDay: () => void;
    onCompleteDay: () => void; // Explicitly mark day as complete if all rules done? Or auto?
    timeZone?: string;
}

const ChallengeWidget: React.FC<Props> = ({ challenge, onUpdateRule, onFailDay, timeZone = DEFAULT_TIME_ZONE }) => {
    const today = getDateKeyInTimeZone(new Date(), timeZone);
    const dayIndex = Math.floor((new Date().getTime() - challenge.startDate) / (1000 * 60 * 60 * 24));

    // Get current day state
    const currentDayState = challenge.history[today] || {
        date: today,
        status: 'PENDING',
        completedRules: []
    };

    // Calculate stats
    const historyValues = Object.values(challenge.history) as any[]; // Cast to any or ChallengeDay[] if imported
    const completedDays = historyValues.filter(d => d.status === 'SUCCESS').length;
    const failedDays = historyValues.filter(d => d.status === 'FAILED').length;
    const isFailed = challenge.status === 'FAILED';

    // Generate the 30-day chain array
    const chain = useMemo(() => {
        return Array.from({ length: challenge.durationDays }).map((_, i) => {
            const date = getDateKeyInTimeZone(new Date(challenge.startDate + i * 86400000), timeZone);
            const historyItem = challenge.history[date];

            let status: ChallengeDayStatus | 'FUTURE' = 'FUTURE';
            if (historyItem) {
                status = historyItem.status;
            } else if (date < today) {
                status = 'FAILED'; // Auto-fail past days if no record? Or just explicit? 
                // For Iron Protocol, if you missed it, it's a fail.
            } else if (date === today) {
                status = currentDayState.status;
            }

            return { index: i + 1, date, status };
        });
    }, [challenge, today, currentDayState, timeZone]);

    if (isFailed) {
        return (
            <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center mb-2">
                    <Skull size={32} className="text-red-500" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-red-500 uppercase tracking-widest">Protocol Failed</h3>
                    <p className="text-red-400/60 text-xs mt-1">Discipline is the bridge between goals and accomplishment.</p>
                </div>
                <div className="text-red-500 font-mono text-sm">
                    Survived {completedDays} Days
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Flame size={18} className="text-amber-500" fill="currentColor" fillOpacity={0.2} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">{challenge.name}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                            <span>DAY {dayIndex + 1}/{challenge.durationDays}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span className={failedDays === 0 ? "text-emerald-500" : "text-red-500"}>
                                {failedDays === 0 ? "PERFECT STREAK" : `${failedDays} STRIKES`}
                            </span>
                        </div>
                    </div>
                </div>
                {currentDayState.status === 'SUCCESS' && (
                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                        <Check size={12} strokeWidth={3} />
                        <span>Day Complete</span>
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col md:flex-row">
                {/* The Chain Visual */}
                <div className="p-4 flex-1 border-r border-zinc-800/50 min-h-[120px]">
                    <div className="grid grid-cols-10 gap-1.5 auto-rows-min h-full content-start">
                        {chain.map((day) => {
                            let bg = "bg-zinc-800/30";
                            let border = "border-zinc-800";
                            let text = "text-zinc-700";

                            if (day.status === 'SUCCESS') {
                                bg = "bg-emerald-500";
                                border = "border-emerald-400";
                                text = "text-black font-bold";
                            } else if (day.status === 'FAILED') {
                                bg = "bg-red-500/20";
                                border = "border-red-500/50";
                                text = "text-red-500";
                            } else if (day.status === 'FROZEN') {
                                bg = "bg-blue-500/20";
                                border = "border-blue-500/50";
                                text = "text-blue-500";
                            } else if (day.status === 'PENDING' && day.date === today) {
                                bg = "bg-amber-500/10 animate-pulse";
                                border = "border-amber-500/40";
                                text = "text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]";
                            }

                            return (
                                <div
                                    key={day.index}
                                    className={`aspect-square rounded-sm border ${bg} ${border} ${text} flex items-center justify-center text-[9px] cursor-help transition-all`}
                                    title={`${day.date}: ${day.status}`}
                                >
                                    {day.status === 'SUCCESS' ? <Check size={10} strokeWidth={4} /> :
                                        day.status === 'FAILED' ? <X size={10} strokeWidth={3} /> :
                                            day.index}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Daily Rules */}
                <div className="w-full md:w-[280px] bg-zinc-950/30 p-4 flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Shield size={12} />
                        Today's Mandates
                    </span>

                    <div className="space-y-2 flex-1">
                        {challenge.rules.map(rule => {
                            const isDone = currentDayState.completedRules.includes(rule.id);
                            return (
                                <button
                                    key={rule.id}
                                    onClick={() => onUpdateRule(rule.id, !isDone)}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded text-left transition-all group ${isDone
                                        ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400'
                                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                        }`}
                                    disabled={currentDayState.status === 'FAILED' || currentDayState.status === 'SUCCESS'}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-zinc-600 group-hover:border-zinc-500'
                                        }`}>
                                        {isDone && <Check size={10} strokeWidth={4} />}
                                    </div>
                                    <span className={`text-[11px] leading-tight font-medium ${isDone ? 'line-through opacity-70' : ''}`}>
                                        {rule.text}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {(currentDayState.status === 'PENDING' || currentDayState.status === 'FAILED') && ( // Allow re-evaluating if failed? Strict is strict.
                        <button
                            onClick={onFailDay}
                            className="w-full py-2 mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-red-500/60 hover:text-red-500 hover:bg-red-500/5 rounded transition-all uppercase tracking-widest border border-transparent hover:border-red-500/20"
                        >
                            <AlertCircle size={12} />
                            Accept Failure
                        </button>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ChallengeWidget;
