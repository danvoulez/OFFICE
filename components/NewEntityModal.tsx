
import React, { useState, useMemo } from 'react';
import { Entity, EntityType } from '../types';
import { useProtocol } from '../context/ProtocolContext';
import { useOnboarding } from '../context/OnboardingContext';
import Avatar from './ui/Avatar';

interface NewEntityModalProps {
  onClose: () => void;
  onCreate: (data: { entity?: Entity, participants?: string[], name?: string, isGroup?: boolean }) => void;
}

const NewEntityModal: React.FC<NewEntityModalProps> = ({ onClose, onCreate }) => {
  const protocolContext = useProtocol();
  const tenantUsers = protocolContext.tenantUsers || [];
  const { session } = useOnboarding();
  const [type, setType] = useState<'human' | 'agent'>('human');
  const [search, setSearch] = useState('');
  
  // Agent-specific states
  const [agentName, setAgentName] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [agentConstitution, setAgentConstitution] = useState('');

  const isAdmin = session?.user?.role === 'Admin';

  const suggestions = React.useMemo(() => {
    if (!search.trim()) return tenantUsers;
    const searchLower = search.toLowerCase();
    return tenantUsers.filter((u: Entity) => 
      u.name?.toLowerCase().includes(searchLower) || 
      (u.role && u.role.toLowerCase().includes(searchLower))
    );
  }, [search, tenantUsers]);

  const handleAddUser = (user: Entity) => {
    onCreate({ participants: [user.id] });
  };

  const handleDeployAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) return;

    const agentId = `agent-${Date.now()}`;
    const newAgent: Entity = {
      id: agentId,
      name: agentName,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${agentName}&backgroundColor=0f172a`,
      type: 'agent',
      status: 'online',
      about: 'Context-aware protocol agent.',
      phone: `UBL-NODE-${Math.floor(Math.random() * 9999)}`,
      constitution: {
        personality: agentConstitution || 'Professional protocol logic.',
        capabilities: ['Task analysis', 'Ledger reporting'],
        quirks: ['Newly deployed']
      }
    };

    if (isGlobal && isAdmin) {
      // Create a global group with this agent
      onCreate({ 
        entity: newAgent, 
        participants: [agentId, ...tenantUsers.map((u: Entity) => u.id)], 
        name: `${agentName} Hub 🤖`,
        isGroup: true 
      });
    } else {
      // Create 1:1 with agent
      onCreate({ entity: newAgent, participants: [agentId] });
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
      
      <div className="relative w-full max-w-lg bg-[var(--bg-card)] shadow-2xl overflow-hidden flex flex-col animate-slide-up border border-[var(--border-primary)] rounded-[2rem]">
        
        {/* Toggle Header */}
        <div className="flex bg-[var(--bg-sidebar)] border-b border-[var(--border-primary)]">
          <button 
            onClick={() => setType('human')}
            className={`flex-1 py-6 flex flex-col items-center justify-center transition-all ${type === 'human' ? 'bg-[var(--bg-card)] text-blue-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          >
            <i className="fas fa-user-plus text-xl mb-2"></i>
            <span className="text-[10px] font-black uppercase tracking-widest">Discover Colleagues</span>
          </button>
          <button 
            onClick={() => setType('agent')}
            className={`flex-1 py-6 flex flex-col items-center justify-center transition-all ${type === 'agent' ? 'bg-[var(--bg-card)] text-emerald-500' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          >
            <i className="fas fa-robot text-xl mb-2"></i>
            <span className="text-[10px] font-black uppercase tracking-widest">Deploy Protocol</span>
          </button>
        </div>

        <div className="p-8">
          {type === 'human' ? (
            <div className="space-y-6">
              <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm"></i>
                <input 
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Enter username or role..."
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-primary)] rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2 mb-4">Tenant Suggestions</p>
                {suggestions.map((u: Entity) => (
                  <div 
                    key={u.id}
                    onClick={() => handleAddUser(u)}
                    className="flex items-center p-3 rounded-2xl hover:bg-[var(--bg-sidebar)] cursor-pointer group transition-all"
                  >
                    <Avatar src={u.avatar} name={u.name} size="md" />
                    <div className="ml-4 flex-1">
                      <h4 className="text-sm font-bold text-[var(--text-main)]">{u.name}</h4>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase">{u.role || 'Protocol Member'}</p>
                    </div>
                    <i className="fas fa-plus text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"></i>
                  </div>
                ))}
                {suggestions.length === 0 && (
                  <div className="py-10 text-center opacity-40 italic text-xs">No colleagues found matching your query.</div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleDeployAgent} className="space-y-6 animate-fade-in">
              <div>
                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Agent Designation</label>
                <input 
                  required
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  placeholder="e.g. AuditBot, CreativeGenie"
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-primary)] rounded-xl py-4 px-5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">Behavioral Constitution</label>
                <textarea 
                  rows={3}
                  value={agentConstitution}
                  onChange={e => setAgentConstitution(e.target.value)}
                  placeholder="Define mission directives..."
                  className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-primary)] rounded-xl py-4 px-5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${isGlobal ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-wider">Tenant-Wide Protocol</h4>
                    <p className="text-[9px] text-[var(--text-muted)] font-medium">Create a Strategic Group for all members.</p>
                  </div>
                  <button 
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setIsGlobal(!isGlobal)}
                    className={`w-12 h-6 rounded-full relative transition-all ${isGlobal ? 'bg-emerald-500' : 'bg-slate-300'} ${!isAdmin ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isGlobal ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
                {!isAdmin && <p className="text-[8px] text-red-500 mt-2 font-bold uppercase tracking-widest"><i className="fas fa-lock mr-1"></i> Admin Privileges Required</p>}
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/10 transition-all active:scale-95"
              >
                Provision Agent Node
              </button>
            </form>
          )}
        </div>
        
        <div className="px-8 py-4 bg-[var(--bg-sidebar)]/50 border-t border-[var(--border-primary)] flex justify-between items-center text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
           <span>UBL Discovery v4.0</span>
           <button onClick={onClose} className="hover:text-[var(--text-main)] transition-colors underline">Cancel Operation</button>
        </div>
      </div>
    </div>
  );
};

export default NewEntityModal;
