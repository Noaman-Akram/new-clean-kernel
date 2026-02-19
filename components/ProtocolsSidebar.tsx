import React, { useState, useMemo } from 'react';
import { ProtocolContext, WeeklyActivities, DailyProtocolState } from '../types';
import {
  Check, Settings, ChevronDown, ChevronRight, Calendar,
  Sunrise, Sunset, Dumbbell, Briefcase, Footprints, Moon, Coffee, BookOpen,
  Heart, Zap, Brain, Utensils, Droplets, Pill, Leaf, Target, Clock
} from 'lucide-react';
import { getDayOfWeekFromDateKey } from '../utils/dateTime';

// Icon mapping for protocol contexts
const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Sunrise, Sunset, Dumbbell, Briefcase, Footprints, Moon, Coffee, BookOpen,
  Heart, Zap, Brain, Utensils, Droplets, Pill, Leaf, Target, Clock
};

interface Props {
  protocolContexts: ProtocolContext[];
  weeklyActivities: WeeklyActivities;
  dailyProtocolState: DailyProtocolState;
  dateKey: string;
  onProtocolToggle: (dateKey: string, itemId: string) => void;
  onWeeklyActivityToggle: (dateKey: string, activityId: string) => void;
  onOpenProtocolsEditor: () => void;
  onOpenWeeklyEditor: () => void;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_LABELS: Record<string, string> = {
  sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
};

const ProtocolsSidebar: React.FC<Props> = ({
  protocolContexts,
  weeklyActivities,
  dailyProtocolState,
  dateKey,
  onProtocolToggle,
  onWeeklyActivityToggle,
  onOpenProtocolsEditor,
  onOpenWeeklyEditor,
}) => {
  const [collapsedContexts, setCollapsedContexts] = useState<Record<string, boolean>>({});
  const [showWeeklyActivities, setShowWeeklyActivities] = useState(true);

  const currentDayKey = useMemo(() => {
    return DAY_KEYS[getDayOfWeekFromDateKey(dateKey)];
  }, [dateKey]);

  const todaysActivities = weeklyActivities[currentDayKey] || [];

  const isProtocolItemChecked = (itemId: string): boolean => {
    return dailyProtocolState[dateKey]?.[itemId] || false;
  };

  const isWeeklyActivityChecked = (activityId: string): boolean => {
    return dailyProtocolState[dateKey]?.[`weekly_${activityId}`] || false;
  };

  const toggleContext = (contextId: string) => {
    setCollapsedContexts(prev => ({ ...prev, [contextId]: !prev[contextId] }));
  };

  // Stats
  const totalProtocolItems = protocolContexts.reduce((sum, ctx) => sum + ctx.items.length, 0);
  const checkedProtocolItems = protocolContexts.reduce((sum, ctx) =>
    sum + ctx.items.filter(item => isProtocolItemChecked(item.id)).length, 0
  );
  const protocolProgress = totalProtocolItems > 0 ? (checkedProtocolItems / totalProtocolItems) * 100 : 0;
  const checkedWeeklyItems = todaysActivities.filter(a => isWeeklyActivityChecked(a.id)).length;
  const weeklyProgress = todaysActivities.length > 0 ? (checkedWeeklyItems / todaysActivities.length) * 100 : 0;

  // Render icon for context
  const renderIcon = (iconName: string, size: number = 14, className: string = '') => {
    const IconComponent = ICON_MAP[iconName];
    if (IconComponent) {
      return <IconComponent size={size} className={className} />;
    }
    // Fallback to a default icon
    return <Target size={size} className={className} />;
  };

  return (
    <div className="h-full flex flex-col text-zinc-400 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Protocols</span>
          {totalProtocolItems > 0 && (
            <span className="text-[9px] text-zinc-600 tabular-nums">
              {checkedProtocolItems}/{totalProtocolItems}
            </span>
          )}
        </div>
        <button
          onClick={onOpenProtocolsEditor}
          className="p-1.5 text-zinc-700 hover:text-zinc-400 transition-colors rounded hover:bg-zinc-900"
          title="Edit Protocols"
        >
          <Settings size={12} />
        </button>
      </div>

      {/* Progress Bar */}
      {totalProtocolItems > 0 && (
        <div className="px-4 py-2">
          <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500/60 transition-all duration-500"
              style={{ width: `${protocolProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Protocol Contexts */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {protocolContexts.map(context => {
          const isCollapsed = collapsedContexts[context.id];
          const contextChecked = context.items.filter(item => isProtocolItemChecked(item.id)).length;
          const allChecked = contextChecked === context.items.length && context.items.length > 0;

          return (
            <div key={context.id} className="rounded">
              {/* Context Header */}
              <button
                onClick={() => toggleContext(context.id)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded transition-colors ${
                  allChecked ? 'bg-emerald-950/20' : 'hover:bg-zinc-900/50'
                }`}
              >
                <div className={`p-1 rounded ${allChecked ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {renderIcon(context.icon, 12)}
                </div>
                <span className={`flex-1 text-left text-[11px] font-medium ${
                  allChecked ? 'text-emerald-400/70' : 'text-zinc-300'
                }`}>
                  {context.name}
                </span>
                <span className="text-[9px] text-zinc-600 tabular-nums">
                  {contextChecked}/{context.items.length}
                </span>
                {isCollapsed ? (
                  <ChevronRight size={12} className="text-zinc-700" />
                ) : (
                  <ChevronDown size={12} className="text-zinc-700" />
                )}
              </button>

              {/* Context Items */}
              {!isCollapsed && (
                <div className="pl-7 pr-2 pb-2 space-y-0.5">
                  {context.items.map(item => {
                    const isChecked = isProtocolItemChecked(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => onProtocolToggle(dateKey, item.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-all group ${
                          isChecked ? 'bg-emerald-950/10' : 'hover:bg-zinc-900/30'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-emerald-500/80 border-emerald-500'
                            : 'border-zinc-700 group-hover:border-zinc-500'
                        }`}>
                          {isChecked && <Check size={10} className="text-black" strokeWidth={3} />}
                        </div>
                        <span className={`text-[10px] transition-colors ${
                          isChecked
                            ? 'text-zinc-600 line-through'
                            : 'text-zinc-400 group-hover:text-zinc-200'
                        }`}>
                          {item.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {protocolContexts.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-[10px] text-zinc-700 uppercase">No protocols configured</p>
            <button
              onClick={onOpenProtocolsEditor}
              className="mt-2 text-[10px] text-emerald-500/60 hover:text-emerald-400 underline underline-offset-2"
            >
              Add protocols
            </button>
          </div>
        )}
      </div>

      {/* Weekly Activities Section */}
      <div className="border-t border-zinc-900">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setShowWeeklyActivities(!showWeeklyActivities)}
            className="flex items-center gap-2"
          >
            <Calendar size={12} className="text-zinc-600" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {DAY_LABELS[currentDayKey]}
            </span>
            {todaysActivities.length > 0 && (
              <span className="text-[9px] text-zinc-600 tabular-nums">
                {checkedWeeklyItems}/{todaysActivities.length}
              </span>
            )}
            {showWeeklyActivities ? (
              <ChevronDown size={10} className="text-zinc-700" />
            ) : (
              <ChevronRight size={10} className="text-zinc-700" />
            )}
          </button>
          <button
            onClick={onOpenWeeklyEditor}
            className="p-1.5 text-zinc-700 hover:text-zinc-400 transition-colors rounded hover:bg-zinc-900"
            title="Edit Weekly Activities"
          >
            <Settings size={12} />
          </button>
        </div>

        {todaysActivities.length > 0 && showWeeklyActivities && (
          <div className="px-4 pb-2">
            <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500/60 transition-all duration-500"
                style={{ width: `${weeklyProgress}%` }}
              />
            </div>
          </div>
        )}

        {showWeeklyActivities && (
          <div className="px-2 pb-4 space-y-0.5">
            {todaysActivities.map(activity => {
              const isChecked = isWeeklyActivityChecked(activity.id);
              return (
                <button
                  key={activity.id}
                  onClick={() => onWeeklyActivityToggle(dateKey, activity.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-all group ${
                    isChecked ? 'bg-blue-950/10' : 'hover:bg-zinc-900/30'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                    isChecked
                      ? 'bg-blue-500/80 border-blue-500'
                      : 'border-zinc-700 group-hover:border-zinc-500'
                  }`}>
                    {isChecked && <Check size={10} className="text-black" strokeWidth={3} />}
                  </div>
                  <span className={`text-[10px] transition-colors ${
                    isChecked
                      ? 'text-zinc-600 line-through'
                      : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}>
                    {activity.text}
                  </span>
                </button>
              );
            })}

            {todaysActivities.length === 0 && (
              <div className="py-4 text-center">
                <p className="text-[10px] text-zinc-700 italic">No activities for {DAY_LABELS[currentDayKey]}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProtocolsSidebar;
