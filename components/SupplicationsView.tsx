
import React, { useState } from 'react';
import { Sun, Moon, Sparkles, RotateCcw } from 'lucide-react';

// Static Data for Adhkar
const ADHKAR_DATA = {
    MORNING: [
        {
            id: 'm1',
            arabic: 'اللّهُـمَّ بِكَ أَصْـبَحْنا وَبِكَ أَمْسَـينا ، وَبِكَ نَحْـيا وَبِكَ نَمُـوتُ وَإِلَـيْكَ النُّـشُور',
            translation: 'O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the Final Return.',
            count: 1
        },
        {
            id: 'm2',
            arabic: 'أَصْبَـحْـنا وَأَصْبَـحَ المُـلْكُ لله وَالحَمدُ لله ، لا إلهَ إلاّ اللّهُ وَحدَهُ لا شَريكَ لهُ، لهُ المُـلكُ ولهُ الحَمْـد، وهُوَ على كلّ شَيءٍ قدير',
            translation: 'We have entered a new day and with it all dominion is Allah’s. Praise is to Allah. None has the right to be worshipped but Allah alone, Who has no partner...',
            count: 1
        },
        {
            id: 'm3',
            arabic: 'سُبْحـانَ اللهِ وَبِحَمْـدِهِ',
            translation: 'Glory is to Allah and praise is to Him.',
            count: 100
        }
    ],
    EVENING: [
        {
            id: 'e1',
            arabic: 'اللّهُـمَّ بِكَ أَمْسَـينا وَبِكَ أَصْـبَحْنا، وَبِكَ نَحْـيا وَبِكَ نَمُـوتُ وَإِلَـيْكَ الْمَصِير',
            translation: 'O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is the final return.',
            count: 1
        },
        {
            id: 'e2',
            arabic: 'أَمْسَيْـنا وَأَمْسـى المُـلْكُ لله وَالحَمدُ لله ، لا إلهَ إلاّ اللّهُ وَحدَهُ لا شَريكَ لهُ',
            translation: 'We have entered the evening and with it all dominion is Allah’s. Praise is to Allah. None has the right to be worshipped but Allah alone...',
            count: 1
        },
        {
            id: 'e3',
            arabic: 'أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهِ',
            translation: 'I seek forgiveness from Allah and repent to Him.',
            count: 100
        }
    ],
    GENERAL: [
        {
            id: 'g1',
            arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
            translation: 'Our Lord! Give us in this world that which is good and in the Hereafter that which is good, and save us from the torment of the Fire!',
            count: 1
        },
        {
            id: 'g2',
            arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ',
            translation: 'O Allah, I ask You for well-being in this world and the Hereafter.',
            count: 1
        }
    ]
};

const SupplicationsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'MORNING' | 'EVENING' | 'GENERAL'>('MORNING');
    const [counts, setCounts] = useState<Record<string, number>>({});

    const handleCount = (id: string, max: number) => {
        setCounts(prev => {
            const current = prev[id] || 0;
            if (current >= max) return prev;
            return { ...prev, [id]: current + 1 };
        });
    };

    const handleReset = () => setCounts({});

    const list = ADHKAR_DATA[activeTab];

    return (
        <div className="h-full flex flex-col bg-background animate-fade-in">
             {/* HEADER */}
             <div className="h-16 border-b border-border bg-surface flex items-center justify-between px-8">
                 <div className="flex items-center gap-3 text-zinc-200 font-medium">
                     <Sparkles size={18} className="text-emerald-500" />
                     <span>THE SANCTUARY</span>
                 </div>
                 <div className="flex gap-2">
                     <Tab active={activeTab === 'MORNING'} onClick={() => setActiveTab('MORNING')} icon={<Sun size={14}/>} label="Morning" />
                     <Tab active={activeTab === 'EVENING'} onClick={() => setActiveTab('EVENING')} icon={<Moon size={14}/>} label="Evening" />
                     <Tab active={activeTab === 'GENERAL'} onClick={() => setActiveTab('GENERAL')} icon={<Sparkles size={14}/>} label="Du'a" />
                 </div>
             </div>

             {/* CONTENT */}
             <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-8">
                 <div className="flex justify-end mb-4">
                     <button onClick={handleReset} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300">
                         <RotateCcw size={12}/> Reset Counters
                     </button>
                 </div>
                 
                 {list.map(dhikr => {
                     const current = counts[dhikr.id] || 0;
                     const isDone = current >= dhikr.count;
                     
                     return (
                         <div key={dhikr.id} className={`
                             p-6 rounded-lg border transition-all duration-300
                             ${isDone ? 'bg-emerald-950/10 border-emerald-900/50' : 'bg-surface border-border'}
                         `}>
                             <div className="text-right mb-6">
                                 <p className="text-2xl md:text-3xl leading-relaxed font-serif text-zinc-100" style={{fontFamily: 'Amiri, serif'}}>
                                     {dhikr.arabic}
                                 </p>
                             </div>
                             
                             <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                 <p className="text-sm text-zinc-500 max-w-lg leading-relaxed italic">
                                     {dhikr.translation}
                                 </p>
                                 
                                 <div className="flex items-center gap-4 shrink-0">
                                     <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                                         {current} / {dhikr.count}
                                     </div>
                                     <button 
                                        onClick={() => handleCount(dhikr.id, dhikr.count)}
                                        disabled={isDone}
                                        className={`
                                            w-12 h-12 rounded-full flex items-center justify-center border transition-all
                                            ${isDone 
                                                ? 'bg-emerald-500 text-black border-emerald-400' 
                                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white hover:border-zinc-500 active:scale-95'}
                                        `}
                                     >
                                         {isDone ? <Sparkles size={18} fill="currentColor"/> : <PlusIcon />}
                                     </button>
                                 </div>
                             </div>
                             
                             <div className="mt-4 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                 <div 
                                    className={`h-full transition-all duration-300 ${isDone ? 'bg-emerald-500' : 'bg-zinc-600'}`} 
                                    style={{ width: `${(current / dhikr.count) * 100}%` }}
                                 />
                             </div>
                         </div>
                     );
                 })}

                 <div className="h-20 flex items-center justify-center text-zinc-600 text-sm font-mono opacity-50">
                     *** END OF SECTION ***
                 </div>
             </div>
        </div>
    );
};

const Tab = ({ active, onClick, icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-medium transition-all ${active ? 'bg-zinc-100 text-black border-white' : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
    >
        {icon} {label}
    </button>
);

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
)

export default SupplicationsView;
