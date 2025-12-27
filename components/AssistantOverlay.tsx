
import React, { useEffect, useState } from 'react';
import { Entity, MessageAction } from '../types';

interface AssistantOverlayProps {
  assistant: Entity;
  contextName: string;
  onClose: () => void;
  onAction: (command: string) => void;
}

const AssistantOverlay: React.FC<AssistantOverlayProps> = ({ assistant, contextName, onClose, onAction }) => {
  const [isThinking, setIsThinking] = useState(true);
  const [suggestions, setSuggestions] = useState<MessageAction[]>([]);

  useEffect(() => {
    // Simulated context analysis
    const timer = setTimeout(() => {
      setIsThinking(false);
      setSuggestions([
        { id: 's1', label: 'Summarize Context', icon: 'fas fa-align-left', command: `Core, summarize what's happening in ${contextName}.`, variant: 'primary' },
        { id: 's2', label: 'Analyze Risk', icon: 'fas fa-shield-halved', command: `Core, are there any protocol risks in ${contextName}?`, variant: 'warning' },
        { id: 's3', label: 'Identify Next Steps', icon: 'fas fa-forward', command: `Core, what are our immediate next actions for ${contextName}?`, variant: 'success' },
      ]);
    }, 1200);
    return () => clearTimeout(timer);
  }, [contextName]);

  const handleTriggerAction = (command: string) => {
    onAction(command);
    onClose();
  };

  return (
    <div className="absolute right-6 bottom-24 w-85 z-50 animate-slide-up">
      <div className="bg-[var(--bg-card)] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[var(--border-primary)] overflow-hidden flex flex-col transition-all">
        {/* Header */}
        <div className="bg-slate-900 p-5 flex items-center space-x-4 text-white">
          <div className="relative">
            <img src={assistant.avatar} alt="Core" className="w-11 h-11 rounded-xl border border-white/10 shadow-lg" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-0.5">Oversight Mode</h4>
            <p className="text-[9px] opacity-60 font-bold uppercase truncate tracking-widest">Watching: {contextName}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 w-8 h-8 flex items-center justify-center rounded-lg transition-colors">
            <i className="fas fa-times text-[10px]"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-sidebar)]">
          {isThinking ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
              </div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Auditing Ledger...</p>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-[var(--text-main)] font-medium leading-relaxed italic opacity-80 border-l-2 border-blue-500/30 pl-4 py-1">
                "UBL Core initialized. Context synchronized. Strategic shortcuts available below."
              </p>
              <div className="space-y-2.5">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleTriggerAction(s.command)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-[0.15em] transition-all hover:translate-x-1 active:scale-95 flex items-center shadow-sm
                      ${s.variant === 'warning' ? 'bg-amber-500/5 border-amber-500/20 text-amber-600' : 
                        s.variant === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' : 
                        'bg-blue-500/5 border-blue-500/20 text-blue-600'}
                    `}
                  >
                    <i className={`${s.icon} mr-4 opacity-70`}></i>
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-sidebar)]/30 border-t border-[var(--border-primary)] flex justify-between items-center">
          <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] opacity-50 underline decoration-blue-500/30">Protocol Secure</span>
          <div className="flex space-x-1 opacity-20">
            <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
            <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
            <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantOverlay;
