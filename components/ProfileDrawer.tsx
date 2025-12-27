
import React, { useState } from 'react';
import { Entity } from '../types';
import { useOnboarding } from '../context/OnboardingContext';
import SettingsSection from './profile/SettingsSection';

interface ProfileDrawerProps {
  entity: Entity;
  onClose: () => void;
  initialTab?: 'profile' | 'settings';
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ entity, onClose, initialTab = 'profile' }) => {
  const { session } = useOnboarding();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>(initialTab);
  
  const isAgent = entity.type === 'agent';
  const isMe = session?.user?.id === entity.id;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-[var(--bg-card)] h-full shadow-2xl flex flex-col animate-slide-in border-l border-[var(--border-primary)]">
        
        {/* Header Profissional com Tabs para o usuário atual */}
        <div className="h-[70px] flex items-center px-6 border-b border-[var(--border-primary)] bg-[var(--bg-sidebar)] shrink-0">
          <div className="flex-1 flex items-center space-x-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Identity
            </button>
            {isMe && (
              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Settings
              </button>
            )}
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-2xl transition-colors">
            <i className="fas fa-times text-[var(--text-muted)] text-sm"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'profile' ? (
            <div className="animate-fade-in">
              {/* Profile View */}
              <div className="flex flex-col items-center py-8 px-8 border-b border-[var(--border-primary)] bg-[var(--bg-sidebar)]">
                <div className="relative mb-5">
                  <img src={entity.avatar} alt={entity.name} className="w-24 h-24 rounded-2xl border border-[var(--border-primary)]" />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 ${entity.status === 'online' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-main)] text-center">{entity.name}</h2>
                <p className="text-sm text-[var(--text-muted)] mt-2">{entity.role || 'Member'}</p>
              </div>

              <div className="px-8 py-6 space-y-6">
                <section>
                  <h4 className="text-xs font-semibold text-[var(--text-muted)] mb-3">About</h4>
                  <p className="text-sm text-[var(--text-main)] leading-relaxed bg-[var(--bg-sidebar)] p-4 rounded-xl border border-[var(--border-primary)]">
                    {entity.about}
                  </p>
                </section>

                {isAgent && entity.constitution && (
                  <section>
                    <h4 className="text-xs font-semibold text-[var(--text-muted)] mb-3">Capabilities</h4>
                    <div className="space-y-2">
                      {entity.constitution.capabilities.map((cap, i) => (
                        <div key={i} className="text-sm text-[var(--text-main)] bg-[var(--bg-sidebar)] px-4 py-2 rounded-lg border border-[var(--border-primary)]">
                          {cap}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fas fa-shield-check text-emerald-600"></i>
                    <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-500">Verified Identity</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Cryptographically bound to <strong>{session?.tenant?.name || 'UBL Network'}</strong>. All ledger entries are immutable and auditable.
                  </p>
                </section>
              </div>
            </div>
          ) : (
            <div className="px-8 py-10 animate-fade-in">
              <SettingsSection />
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-8 bg-[var(--bg-sidebar)] border-t border-[var(--border-primary)] flex justify-between items-center">
           <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.5em]">System V4.5 // Verified</span>
           <div className="flex space-x-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDrawer;
