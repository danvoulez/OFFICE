
import React, { useState } from 'react';
import { Conversation, Entity } from '../types';
import { useOnboarding } from '../context/OnboardingContext';

interface SidebarProps {
  conversations: Conversation[];
  activeConvId: string | null;
  onSelectConv: (id: string) => void;
  entities: Entity[];
  currentUser: Entity;
  onToggleStatus: () => void;
  onInspectEntity: (entity: Entity, initialTab?: 'profile' | 'settings') => void;
  onNewEntity: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  conversations, 
  activeConvId, 
  onSelectConv, 
  entities, 
  currentUser,
  onToggleStatus,
  onInspectEntity,
  onNewEntity
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { logout } = useOnboarding();

  const filteredConversations = conversations.filter(conv => {
    if (!conv || !conv.participants) return false;
    if (conv.isGroup) return (conv.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const otherParticipantId = conv.participants.find(p => p !== currentUser?.id);
    const otherEntity = entities.find(e => e.id === otherParticipantId);
    return (otherEntity?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-primary)] z-30 transition-colors">
      <div className="p-5 flex items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-card)]">
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => onInspectEntity(currentUser, 'profile')}>
          <div className="relative">
            <img src={currentUser.avatar} alt="me" className="w-10 h-10 rounded-xl shadow-sm border border-[var(--border-primary)] transition-transform group-hover:scale-105" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
              title={`Status: ${currentUser.status || 'online'} (click to toggle)`}
              className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-[var(--bg-card)] rounded-full shadow-sm transition-colors ${
                currentUser.status === 'away' ? 'bg-amber-500' : currentUser.status === 'busy' ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-base font-semibold text-[var(--text-main)] leading-none truncate max-w-[160px]">{currentUser.name}</span>
            <span className="text-xs text-blue-600 font-semibold mt-1">My Identity</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button 
            onClick={onNewEntity} 
            title="New Workstream"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
          >
            <i className="fas fa-plus text-sm"></i>
          </button>
          <button 
            onClick={() => onInspectEntity(currentUser, 'settings')} 
            title="Protocol Settings"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-muted)] hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          >
            <i className="fas fa-cog text-sm"></i>
          </button>
          <button 
            onClick={logout} 
            title="Release Session"
            className="w-9 h-9 flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <i className="fas fa-power-off text-sm"></i>
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="relative">
          <label htmlFor="search-workstreams" className="sr-only">Search workstreams</label>
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs opacity-50"></i>
          <input 
            id="search-workstreams"
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workstreams..." 
            aria-label="Search workstreams"
            className="w-full bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all placeholder:text-[var(--text-muted)] shadow-sm focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        <div className="px-3 py-2">
          <span className="text-xs font-semibold text-[var(--text-muted)] opacity-80">Strategic Contexts</span>
        </div>

        {filteredConversations.map(conv => {
          const isActive = activeConvId === conv.id;
          let name = conv.name;
          let avatar = conv.avatar;
          let isAgentChat = false;

          if (!conv.isGroup) {
            const otherParticipantId = conv.participants.find(p => p !== currentUser.id);
            const otherEntity = entities.find(e => e.id === otherParticipantId);
            name = otherEntity?.name || 'Unknown';
            avatar = otherEntity?.avatar || '';
            isAgentChat = otherEntity?.type === 'agent';
          }

          return (
            <div 
              key={conv.id}
              onClick={() => onSelectConv(conv.id)}
              className={`flex items-center px-3 py-3 cursor-pointer rounded-xl transition-all ${
                isActive 
                  ? 'bg-[var(--bg-card)] border-l-2 border-blue-500' 
                  : 'hover:bg-[var(--bg-card)]/50'
              }`}
            >
              <div className="shrink-0 relative">
                {conv.isGroup ? (
                   <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                      <i className="fas fa-users text-sm"></i>
                   </div>
                ) : (
                  <img src={avatar} alt={name} className="w-10 h-10 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)]" />
                )}
                {conv.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-semibold w-5 h-5 rounded-full flex items-center justify-center">
                    {conv.unreadCount}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 ml-3">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`font-semibold text-base truncate ${isActive ? 'text-blue-600' : 'text-[var(--text-main)]'}`}>
                    {name}
                  </h3>
                </div>
                <p className={`text-sm truncate ${isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                  {conv.lastMessage || 'No messages yet'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-[var(--border-primary)] flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity">
        <span className="text-xs font-semibold text-[var(--text-muted)]">UBL OS V4.0</span>
        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
      </div>
    </div>
  );
};

export default Sidebar;
