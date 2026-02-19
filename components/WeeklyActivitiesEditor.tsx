import React, { useState } from 'react';
import { WeeklyActivities, WeeklyActivity } from '../types';
import { X, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { generateId } from '../utils';

interface Props {
  weeklyActivities: WeeklyActivities;
  onUpdate: (activities: WeeklyActivities) => void;
  onClose: () => void;
}

const DAYS = [
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
] as const;

const WeeklyActivitiesEditor: React.FC<Props> = ({ weeklyActivities, onUpdate, onClose }) => {
  const [activities, setActivities] = useState<WeeklyActivities>({ ...weeklyActivities });
  const [selectedDay, setSelectedDay] = useState<string>('fri');
  const [newItemText, setNewItemText] = useState('');

  const currentDayActivities = activities[selectedDay] || [];

  const handleAddActivity = () => {
    if (!newItemText.trim()) return;
    const newActivity: WeeklyActivity = {
      id: generateId(),
      text: newItemText.trim(),
    };
    setActivities({
      ...activities,
      [selectedDay]: [...currentDayActivities, newActivity],
    });
    setNewItemText('');
  };

  const handleDeleteActivity = (activityId: string) => {
    setActivities({
      ...activities,
      [selectedDay]: currentDayActivities.filter(a => a.id !== activityId),
    });
  };

  const handleUpdateActivityText = (activityId: string, text: string) => {
    setActivities({
      ...activities,
      [selectedDay]: currentDayActivities.map(a =>
        a.id === activityId ? { ...a, text } : a
      ),
    });
  };

  const handleMoveActivity = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentDayActivities.length) return;
    const newActivities = [...currentDayActivities];
    [newActivities[index], newActivities[newIndex]] = [newActivities[newIndex], newActivities[index]];
    setActivities({
      ...activities,
      [selectedDay]: newActivities,
    });
  };

  const handleCopyToDay = (targetDay: string) => {
    if (targetDay === selectedDay) return;
    const copiedActivities = currentDayActivities.map(a => ({
      ...a,
      id: generateId(), // New IDs for copied items
    }));
    setActivities({
      ...activities,
      [targetDay]: [...(activities[targetDay] || []), ...copiedActivities],
    });
  };

  const handleSave = () => {
    onUpdate(activities);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-background border border-border rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-medium text-zinc-100">Weekly Activities</h2>
            <p className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-wider">
              Configure activities for each day of the week
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors rounded hover:bg-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Day Tabs */}
        <div className="flex border-b border-border px-4 shrink-0 overflow-x-auto">
          {DAYS.map(day => {
            const dayActivities = activities[day.key] || [];
            return (
              <button
                key={day.key}
                onClick={() => setSelectedDay(day.key)}
                className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  selectedDay === day.key
                    ? 'border-emerald-500 text-emerald-500'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {day.short}
                {dayActivities.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    selectedDay === day.key
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {dayActivities.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-lg mx-auto">
            {/* Day Title */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-zinc-300">
                {DAYS.find(d => d.key === selectedDay)?.label} Activities
              </h3>
              <p className="text-[10px] text-zinc-600 mt-1">
                These activities will appear every {DAYS.find(d => d.key === selectedDay)?.label}
              </p>
            </div>

            {/* Activities List */}
            <div className="space-y-2 mb-6">
              {currentDayActivities.map((activity, index) => (
                <div key={activity.id} className="flex items-center gap-2 group">
                  <div className="flex flex-col gap-0">
                    <button
                      onClick={() => handleMoveActivity(index, 'up')}
                      disabled={index === 0}
                      className="text-zinc-700 hover:text-zinc-500 disabled:opacity-20 p-0.5"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={() => handleMoveActivity(index, 'down')}
                      disabled={index === currentDayActivities.length - 1}
                      className="text-zinc-700 hover:text-zinc-500 disabled:opacity-20 p-0.5"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  <input
                    value={activity.text}
                    onChange={e => handleUpdateActivityText(activity.id, e.target.value)}
                    className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded px-4 py-2.5 text-sm text-zinc-300 outline-none focus:border-zinc-600 transition-colors"
                  />
                  <button
                    onClick={() => handleDeleteActivity(activity.id)}
                    className="p-2 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {currentDayActivities.length === 0 && (
                <div className="py-8 text-center border border-dashed border-zinc-800 rounded-lg">
                  <p className="text-xs text-zinc-600">No activities for this day</p>
                  <p className="text-[10px] text-zinc-700 mt-1">Add activities below</p>
                </div>
              )}
            </div>

            {/* Add Activity */}
            <div className="flex items-center gap-2 mb-8">
              <input
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddActivity(); }}
                placeholder="Add activity..."
                className="flex-1 bg-zinc-950/50 border border-dashed border-zinc-700 rounded px-4 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-500 transition-colors"
              />
              <button
                onClick={handleAddActivity}
                disabled={!newItemText.trim()}
                className="px-4 py-2.5 bg-emerald-500 text-black text-xs font-bold rounded hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {/* Copy to Other Days */}
            {currentDayActivities.length > 0 && (
              <div className="border-t border-zinc-900 pt-6">
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">
                  Copy activities to:
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAYS.filter(d => d.key !== selectedDay).map(day => (
                    <button
                      key={day.key}
                      onClick={() => handleCopyToDay(day.key)}
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-900 text-zinc-400 text-sm rounded hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-emerald-500 text-black text-sm font-bold rounded hover:bg-emerald-400 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyActivitiesEditor;
