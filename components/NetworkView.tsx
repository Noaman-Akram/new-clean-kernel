import React, { useState } from 'react';
import { AppState, Client, EntityContext, EntityType, Category } from '../types';
import { generateId } from '../utils';
import { Plus, X, User, Briefcase, Building2, Mail, Link as LinkIcon, DollarSign } from 'lucide-react';

interface Props {
  state: AppState;
  onAdd: (client: Client) => void;
  onUpdate: (id: string, updates: Partial<Client>) => void;
  onDelete: (id: string) => void;
}

const NetworkView: React.FC<Props> = ({ state, onAdd, onUpdate, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const context: EntityContext = 'PERSONAL'; // Hardcoded for this view

  const filteredContacts = state.clients.filter(c => c.context === context);

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in overflow-hidden">
      {/* HEADER */}
      <div className="p-4 md:p-6 border-b border-border bg-surface/30 shrink-0">
        <div className="max-w-5xl mx-auto space-y-4">

          {/* Header Area */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-zinc-100">
              <div className="p-2 bg-zinc-800/50 rounded-lg">
                <User size={20} className="text-zinc-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Personal Network</h1>
                <p className="text-xs text-zinc-500">Manage your connections and relationships</p>
              </div>
            </div>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
            >
              <Plus size={14} />
              {isAdding ? 'Cancel' : 'Add Contact'}
            </button>
          </div>

          {/* Add Forms */}
          {isAdding && (
            <PersonalAddForm
              onAdd={(data) => {
                onAdd(data);
                setIsAdding(false);
              }}
              onCancel={() => setIsAdding(false)}
            />
          )}
        </div>
      </div>

      {/* CONTACTS LIST */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {filteredContacts.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 text-xs font-mono">
              No contacts yet. Add your first {context === 'NEMO' ? agencyTab.toLowerCase() : 'contact'}!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map(contact => (
                <PersonalCard
                  key={contact.id}
                  contact={contact}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};





// Personal Add Form (Simpler)
const PersonalAddForm: React.FC<{
  onAdd: (data: Client) => void;
  onCancel: () => void;
}> = ({ onAdd, onCancel }) => {
  const [form, setForm] = useState({
    name: '',
    role: '',
    company: '',
    contactHandle: '',
    nextAction: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    onAdd({
      id: generateId(),
      name: form.name.trim(),
      role: form.role.trim() || 'Friend',
      company: form.company.trim() || 'N/A',
      context: 'PERSONAL',
      type: 'NETWORK',
      status: 'WARM',
      tags: [],
      rate: 0,
      rateType: 'NONE',
      currency: 'USD',
      lastInteraction: Date.now(),
      nextAction: form.nextAction.trim(),
      contactHandle: form.contactHandle.trim() || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={form.name}
          onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Name *"
          className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
          autoFocus
        />
        <input
          value={form.role}
          onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
          placeholder="Relationship"
          className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
        />
      </div>

      <input
        value={form.company}
        onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))}
        placeholder="Company/Context"
        className="w-full bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={form.contactHandle}
          onChange={e => setForm(prev => ({ ...prev, contactHandle: e.target.value }))}
          placeholder="@handle or contact"
          className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
        />
        <input
          value={form.nextAction}
          onChange={e => setForm(prev => ({ ...prev, nextAction: e.target.value }))}
          placeholder="Next touchpoint"
          className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={!form.name.trim()}
        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add Contact
      </button>
    </form>
  );
};



// Personal Card (Minimal)
const PersonalCard: React.FC<{
  contact: Client;
  onUpdate: (id: string, updates: Partial<Client>) => void;
  onDelete: (id: string) => void;
}> = ({ contact, onUpdate, onDelete }) => {
  const daysSinceContact = Math.floor((Date.now() - contact.lastInteraction) / (1000 * 60 * 60 * 24));

  return (
    <div className="group bg-surface border border-zinc-800 hover:border-zinc-700 rounded-lg p-4 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-zinc-200 truncate">{contact.name}</h3>
          <p className="text-xs text-zinc-500 truncate">{contact.role}</p>
        </div>
        <button
          onClick={() => {
            if (window.confirm(`Delete ${contact.name}?`)) {
              onDelete(contact.id);
            }
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-500 transition-all"
        >
          <X size={12} />
        </button>
      </div>

      {contact.company && contact.company !== 'N/A' && (
        <p className="text-xs text-zinc-600 mb-3">{contact.company}</p>
      )}

      {contact.contactHandle && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
          <LinkIcon size={10} className="shrink-0" />
          <span className="truncate">{contact.contactHandle}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
        <span className="text-[10px] text-zinc-600 font-mono">
          {daysSinceContact === 0 ? 'Today' : daysSinceContact === 1 ? 'Yesterday' : `${daysSinceContact}d ago`}
        </span>
        <button
          onClick={() => onUpdate(contact.id, { lastInteraction: Date.now() })}
          className="px-3 py-1 bg-zinc-900 hover:bg-emerald-950/30 text-zinc-400 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-900/30 text-[10px] font-mono rounded transition-colors"
        >
          Touch
        </button>
      </div>
    </div>
  );
};

export default NetworkView;
