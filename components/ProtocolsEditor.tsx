import React, { useState } from 'react';
import { ProtocolContext, ProtocolItem } from '../types';
import {
  X, Plus, Trash2, ChevronUp, ChevronDown,
  Sunrise, Sunset, Dumbbell, Briefcase, Footprints, Moon, Coffee, BookOpen,
  Heart, Zap, Brain, Utensils, Droplets, Pill, Leaf, Target, Clock,
  Flame, Mountain, Music, Pencil, Star, Sun, Wind, Waves
} from 'lucide-react';
import { generateId } from '../utils';

interface Props {
  protocolContexts: ProtocolContext[];
  onUpdate: (contexts: ProtocolContext[]) => void;
  onClose: () => void;
}

// Available icons with their names
const AVAILABLE_ICONS = [
  { name: 'Sunrise', component: Sunrise },
  { name: 'Sunset', component: Sunset },
  { name: 'Sun', component: Sun },
  { name: 'Moon', component: Moon },
  { name: 'Dumbbell', component: Dumbbell },
  { name: 'Briefcase', component: Briefcase },
  { name: 'Footprints', component: Footprints },
  { name: 'Coffee', component: Coffee },
  { name: 'BookOpen', component: BookOpen },
  { name: 'Heart', component: Heart },
  { name: 'Zap', component: Zap },
  { name: 'Brain', component: Brain },
  { name: 'Utensils', component: Utensils },
  { name: 'Droplets', component: Droplets },
  { name: 'Pill', component: Pill },
  { name: 'Leaf', component: Leaf },
  { name: 'Target', component: Target },
  { name: 'Clock', component: Clock },
  { name: 'Flame', component: Flame },
  { name: 'Mountain', component: Mountain },
  { name: 'Music', component: Music },
  { name: 'Star', component: Star },
  { name: 'Wind', component: Wind },
  { name: 'Waves', component: Waves },
];

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = Object.fromEntries(
  AVAILABLE_ICONS.map(i => [i.name, i.component])
);

const ProtocolsEditor: React.FC<Props> = ({ protocolContexts, onUpdate, onClose }) => {
  const [contexts, setContexts] = useState<ProtocolContext[]>(protocolContexts);
  const [newContextName, setNewContextName] = useState('');
  const [newContextIcon, setNewContextIcon] = useState('Target');
  const [showAddContext, setShowAddContext] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});

  const handleAddContext = () => {
    if (!newContextName.trim()) return;
    const newContext: ProtocolContext = {
      id: generateId(),
      name: newContextName.trim(),
      icon: newContextIcon,
      items: [],
    };
    setContexts([...contexts, newContext]);
    setNewContextName('');
    setNewContextIcon('Target');
    setShowAddContext(false);
  };

  const handleDeleteContext = (contextId: string) => {
    setContexts(contexts.filter(c => c.id !== contextId));
  };

  const handleUpdateContextName = (contextId: string, name: string) => {
    setContexts(contexts.map(c => c.id === contextId ? { ...c, name } : c));
  };

  const handleUpdateContextIcon = (contextId: string, icon: string) => {
    setContexts(contexts.map(c => c.id === contextId ? { ...c, icon } : c));
    setShowIconPicker(null);
  };

  const handleAddItem = (contextId: string) => {
    const text = newItemText[contextId]?.trim();
    if (!text) return;
    const newItem: ProtocolItem = { id: generateId(), text };
    setContexts(contexts.map(c =>
      c.id === contextId ? { ...c, items: [...c.items, newItem] } : c
    ));
    setNewItemText({ ...newItemText, [contextId]: '' });
  };

  const handleDeleteItem = (contextId: string, itemId: string) => {
    setContexts(contexts.map(c =>
      c.id === contextId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c
    ));
  };

  const handleUpdateItemText = (contextId: string, itemId: string, text: string) => {
    setContexts(contexts.map(c =>
      c.id === contextId
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, text } : i) }
        : c
    ));
  };

  const handleMoveContext = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= contexts.length) return;
    const newContexts = [...contexts];
    [newContexts[index], newContexts[newIndex]] = [newContexts[newIndex], newContexts[index]];
    setContexts(newContexts);
  };

  const handleMoveItem = (contextId: string, itemIndex: number, direction: 'up' | 'down') => {
    setContexts(contexts.map(c => {
      if (c.id !== contextId) return c;
      const newIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
      if (newIndex < 0 || newIndex >= c.items.length) return c;
      const newItems = [...c.items];
      [newItems[itemIndex], newItems[newIndex]] = [newItems[newIndex], newItems[itemIndex]];
      return { ...c, items: newItems };
    }));
  };

  const handleSave = () => {
    onUpdate(contexts);
    onClose();
  };

  const renderIcon = (iconName: string, size: number = 16, className: string = '') => {
    const IconComponent = ICON_MAP[iconName];
    if (IconComponent) {
      return <IconComponent size={size} className={className} />;
    }
    return <Target size={size} className={className} />;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-medium text-zinc-100">Edit Protocols</h2>
            <p className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-wider">
              Context-based daily habits
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors rounded hover:bg-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {contexts.map((context, contextIndex) => (
            <div key={context.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
              {/* Context Header */}
              <div className="flex items-center gap-3 p-4 border-b border-zinc-800/50">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveContext(contextIndex, 'up')}
                    disabled={contextIndex === 0}
                    className="text-zinc-600 hover:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    onClick={() => handleMoveContext(contextIndex, 'down')}
                    disabled={contextIndex === contexts.length - 1}
                    className="text-zinc-600 hover:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>

                {/* Icon Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowIconPicker(showIconPicker === context.id ? null : context.id)}
                    className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-zinc-200"
                  >
                    {renderIcon(context.icon, 18)}
                  </button>
                  {showIconPicker === context.id && (
                    <div className="absolute left-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl z-20 grid grid-cols-6 gap-1 w-64">
                      {AVAILABLE_ICONS.map(icon => (
                        <button
                          key={icon.name}
                          onClick={() => handleUpdateContextIcon(context.id, icon.name)}
                          className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
                            context.icon === icon.name ? 'bg-emerald-950 text-emerald-400' : 'text-zinc-400'
                          }`}
                          title={icon.name}
                        >
                          <icon.component size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  value={context.name}
                  onChange={e => handleUpdateContextName(context.id, e.target.value)}
                  className="flex-1 bg-transparent text-sm font-medium text-zinc-200 outline-none border-b border-transparent hover:border-zinc-700 focus:border-emerald-500 transition-colors px-1 py-0.5"
                  placeholder="Context name..."
                />

                <button
                  onClick={() => handleDeleteContext(context.id)}
                  className="p-2 text-zinc-600 hover:text-red-400 transition-colors rounded hover:bg-red-950/20"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Items */}
              <div className="p-3 space-y-1">
                {context.items.map((item, itemIndex) => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <div className="flex flex-col gap-0">
                      <button
                        onClick={() => handleMoveItem(context.id, itemIndex, 'up')}
                        disabled={itemIndex === 0}
                        className="text-zinc-700 hover:text-zinc-500 disabled:opacity-20 p-0.5"
                      >
                        <ChevronUp size={10} />
                      </button>
                      <button
                        onClick={() => handleMoveItem(context.id, itemIndex, 'down')}
                        disabled={itemIndex === context.items.length - 1}
                        className="text-zinc-700 hover:text-zinc-500 disabled:opacity-20 p-0.5"
                      >
                        <ChevronDown size={10} />
                      </button>
                    </div>
                    <input
                      value={item.text}
                      onChange={e => handleUpdateItemText(context.id, item.id, e.target.value)}
                      className="flex-1 bg-zinc-900/50 border border-zinc-800/50 rounded px-3 py-2 text-xs text-zinc-300 outline-none focus:border-zinc-600 transition-colors"
                    />
                    <button
                      onClick={() => handleDeleteItem(context.id, item.id)}
                      className="p-1.5 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {/* Add Item */}
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-5" />
                  <input
                    value={newItemText[context.id] || ''}
                    onChange={e => setNewItemText({ ...newItemText, [context.id]: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddItem(context.id); }}
                    placeholder="Add item..."
                    className="flex-1 bg-zinc-950/50 border border-dashed border-zinc-800 rounded px-3 py-2 text-xs text-zinc-400 placeholder:text-zinc-700 outline-none focus:border-zinc-600 transition-colors"
                  />
                  <button
                    onClick={() => handleAddItem(context.id)}
                    className="p-1.5 text-zinc-600 hover:text-emerald-400 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add Context */}
          {showAddContext ? (
            <div className="bg-zinc-900/30 border border-dashed border-zinc-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <button
                    onClick={() => setShowIconPicker(showIconPicker === 'new' ? null : 'new')}
                    className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-zinc-200"
                  >
                    {renderIcon(newContextIcon, 18)}
                  </button>
                  {showIconPicker === 'new' && (
                    <div className="absolute left-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl z-20 grid grid-cols-6 gap-1 w-64">
                      {AVAILABLE_ICONS.map(icon => (
                        <button
                          key={icon.name}
                          onClick={() => { setNewContextIcon(icon.name); setShowIconPicker(null); }}
                          className={`p-2 rounded hover:bg-zinc-800 transition-colors ${
                            newContextIcon === icon.name ? 'bg-emerald-950 text-emerald-400' : 'text-zinc-400'
                          }`}
                          title={icon.name}
                        >
                          <icon.component size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  value={newContextName}
                  onChange={e => setNewContextName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddContext(); }}
                  placeholder="Context name..."
                  className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddContext}
                  className="px-4 py-2 bg-emerald-500 text-black text-xs font-bold rounded hover:bg-emerald-400 transition-colors"
                >
                  Add Context
                </button>
                <button
                  onClick={() => { setShowAddContext(false); setNewContextName(''); }}
                  className="px-4 py-2 bg-zinc-900 text-zinc-400 text-xs rounded hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddContext(true)}
              className="w-full py-4 border border-dashed border-zinc-800 rounded-lg text-zinc-600 hover:text-zinc-400 hover:border-zinc-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span className="text-xs uppercase tracking-wider font-medium">Add Context</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
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

export default ProtocolsEditor;
