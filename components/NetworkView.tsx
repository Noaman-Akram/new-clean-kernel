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
  const [context, setContext] = useState<EntityContext>('NEMO');
  const [agencyTab, setAgencyTab] = useState<'TEAM' | 'CLIENT' | 'PARTNER'>('CLIENT');
  const [isAdding, setIsAdding] = useState(false);

  const filteredContacts = state.clients.filter(c => {
    if (c.context !== context) return false;
    if (context === 'NEMO') {
      return c.type === agencyTab;
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in overflow-hidden">
      {/* HEADER */}
      <div className="p-4 md:p-6 border-b border-border bg-surface/30 shrink-0">
        <div className="max-w-5xl mx-auto space-y-4">

          {/* Context Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => { setContext('NEMO'); setIsAdding(false); }}
              className={`flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-lg text-sm font-bold tracking-wide transition-all border ${context === 'NEMO'
                ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30 shadow-sm'
                : 'bg-transparent text-zinc-600 border-transparent hover:text-zinc-400 hover:bg-zinc-900/30'
                }`}
            >
              <Building2 size={18} />
              <div className="flex flex-col items-start">
                <span>AGENCY CRM</span>
                <span className="text-[9px] text-zinc-600 font-normal">Team • Clients • Partners</span>
              </div>
            </button>

            <button
              onClick={() => { setContext('PERSONAL'); setIsAdding(false); }}
              className={`flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-lg text-sm font-bold tracking-wide transition-all border ${context === 'PERSONAL'
                ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30 shadow-sm'
                : 'bg-transparent text-zinc-600 border-transparent hover:text-zinc-400 hover:bg-zinc-900/30'
                }`}
            >
              <User size={18} />
              <div className="flex flex-col items-start">
                <span>PERSONAL</span>
                <span className="text-[9px] text-zinc-600 font-normal">Contacts & Network</span>
              </div>
            </button>
          </div>

          {/* Tabs & Add Button */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {context === 'NEMO' ? (
                <>
                  <TabButton
                    active={agencyTab === 'TEAM'}
                    onClick={() => setAgencyTab('TEAM')}
                    label="Team"
                  />
                  <TabButton
                    active={agencyTab === 'CLIENT'}
                    onClick={() => setAgencyTab('CLIENT')}
                    label="Clients"
                  />
                  <TabButton
                    active={agencyTab === 'PARTNER'}
                    onClick={() => setAgencyTab('PARTNER')}
                    label="Partners"
                  />
                </>
              ) : (
                <TabButton
                  active={true}
                  onClick={() => { }}
                  label="All Contacts"
                />
              )}
            </div>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-md text-xs font-bold hover:bg-zinc-200 transition-colors shrink-0"
            >
              <Plus size={14} />
              {isAdding ? 'Cancel' : `Add ${context === 'NEMO' ? agencyTab : 'Contact'}`}
            </button>
          </div>

          {/* Add Forms */}
          {isAdding && (
            context === 'NEMO' ? (
              <AgencyAddForm
                type={agencyTab}
                onAdd={(data) => {
                  onAdd(data);
                  setIsAdding(false);
                }}
                onCancel={() => setIsAdding(false)}
              />
            ) : (
              <PersonalAddForm
                onAdd={(data) => {
                  onAdd(data);
                  setIsAdding(false);
                }}
                onCancel={() => setIsAdding(false)}
              />
            )
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
                context === 'NEMO' ? (
                  <AgencyCard
                    key={contact.id}
                    contact={contact}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ) : (
                  <PersonalCard
                    key={contact.id}
                    contact={contact}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-xs font-mono uppercase rounded transition-colors ${active
      ? 'bg-zinc-900 text-zinc-300 border border-zinc-800'
      : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/30'
      }`}
  >
    {label}
  </button>
);

// Agency Add Form
const AgencyAddForm: React.FC<{
  type: 'TEAM' | 'CLIENT' | 'PARTNER';
  onAdd: (data: Client) => void;
  onCancel: () => void;
}> = ({ type, onAdd, onCancel }) => {
  const [form, setForm] = useState({
    name: '',
    role: '',
    company: '',
    email: '',
    contactHandle: '',
    nextAction: '',
    rate: 0,
    rateType: 'HOURLY' as Client['rateType'],
    needs: '',
    stage: 'LEAD' as Client['stage']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    onAdd({
      id: generateId(),
      name: form.name.trim(),
      role: form.role.trim() || 'N/A',
      company: form.company.trim() || 'N/A',
      context: 'NEMO',
      type: type,
      status: type === 'CLIENT' ? 'LEAD' : 'ACTIVE',
      tags: [],
      rate: form.rate,
      rateType: form.rateType,
      currency: 'USD',
      lastInteraction: Date.now(),
      nextAction: form.nextAction.trim(),
      email: form.email.trim() || undefined,
      contactHandle: form.contactHandle.trim() || undefined,
      needs: type === 'CLIENT' ? form.needs.trim() || undefined : undefined,
      stage: type === 'CLIENT' ? form.stage : undefined
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
          placeholder="Role"
          className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
        />
      </div>

      <input
        value={form.company}
        onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))}
        placeholder="Company"
        className="w-full bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          value={form.email}
          onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
          placeholder="Email"
          type="email"
          className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
        />
        <input
          value={form.contactHandle}
          onChange={e => setForm(prev => ({ ...prev, contactHandle: e.target.value }))}
          placeholder="@handle"
          className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
        />
      </div>

      {type === 'CLIENT' && (
        <>
          <textarea
            value={form.needs}
            onChange={e => setForm(prev => ({ ...prev, needs: e.target.value }))}
            placeholder="Client needs..."
            className="w-full bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            {(['LEAD', 'DISCOVERY', 'PROPOSAL', 'CLOSED'] as Client['stage'][]).map(stage => (
              <button
                key={stage}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, stage: stage }))}
                className={`px-3 py-1.5 text-[10px] font-mono uppercase rounded transition-colors ${form.stage === stage
                  ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                  : 'bg-transparent text-zinc-600 border border-transparent hover:bg-zinc-900'
                  }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </>
      )}

      {(type === 'TEAM' || type === 'CLIENT') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={form.rate}
            onChange={e => setForm(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
            placeholder="Rate"
            type="number"
            className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
          />
          <select
            value={form.rateType}
            onChange={e => setForm(prev => ({ ...prev, rateType: e.target.value as Client['rateType'] }))}
            className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
          >
            <option value="HOURLY">Hourly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="FIXED">Fixed</option>
            <option value="NONE">None</option>
          </select>
          <input
            value={form.nextAction}
            onChange={e => setForm(prev => ({ ...prev, nextAction: e.target.value }))}
            placeholder="Next action"
            className="bg-background border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 outline-none"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={!form.name.trim()}
        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add {type}
      </button>
    </form>
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

// Agency CRM Card (Cleaner, less info)
const AgencyCard: React.FC<{
  contact: Client;
  onUpdate: (id: string, updates: Partial<Client>) => void;
  onDelete: (id: string) => void;
}> = ({ contact, onUpdate, onDelete }) => {
  return (
    <div className="group bg-surface border border-zinc-800 hover:border-zinc-700 rounded-lg p-4 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-zinc-200 truncate">{contact.name}</h3>
          <p className="text-xs text-zinc-500 truncate">{contact.role} • {contact.company}</p>
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

      {contact.needs && (
        <p className="text-xs text-zinc-600 mb-3 line-clamp-2">{contact.needs}</p>
      )}

      <div className="space-y-2 mb-3">
        {contact.email && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Mail size={10} className="shrink-0" />
            <span className="truncate">{contact.email}</span>
          </div>
        )}
        {contact.contactHandle && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <LinkIcon size={10} className="shrink-0" />
            <span className="truncate">{contact.contactHandle}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        {contact.stage && (
          <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 rounded">
            {contact.stage}
          </span>
        )}
        {contact.rate > 0 && (
          <span className="px-2 py-0.5 text-[9px] font-mono bg-zinc-900 text-zinc-500 rounded border border-zinc-800">
            ${contact.rate}/{contact.rateType === 'HOURLY' ? 'hr' : contact.rateType === 'MONTHLY' ? 'mo' : 'fix'}
          </span>
        )}
      </div>

      {contact.nextAction && (
        <div className="pt-3 border-t border-zinc-800/50">
          <div className="text-[10px] text-zinc-600 font-mono mb-1">Next:</div>
          <input
            value={contact.nextAction}
            onChange={e => onUpdate(contact.id, { nextAction: e.target.value })}
            className="w-full bg-transparent text-xs text-zinc-400 outline-none"
            placeholder="Next action..."
          />
        </div>
      )}
    </div>
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
