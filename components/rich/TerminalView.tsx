
import React from 'react';

interface TerminalViewProps {
  title?: string;
  output: string;
  onExpand: () => void;
  PinButton: React.ReactNode;
}

const TerminalView: React.FC<TerminalViewProps> = ({ title, output, onExpand, PinButton }) => (
  <div 
    className="mt-5 rounded-3xl bg-slate-950 border-2 border-slate-900 overflow-hidden shadow-2xl transition-all cursor-pointer group relative ring-1 ring-white/5"
    onClick={onExpand}
  >
    <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
    
    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
      <div className="flex items-center space-x-4">
        <div className="flex space-x-2">
           <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
           <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">{title || 'Protocol Console'}</span>
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-[9px] font-black text-emerald-500/60 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/20">LIVE_DATA</span>
        {PinButton}
      </div>
    </div>
    <div className="p-6 font-mono text-[13px] leading-relaxed text-emerald-400 bg-black/60 max-h-48 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-slate-950 to-transparent">
        <i className="fas fa-expand-alt text-white/50 hover:text-white"></i>
      </div>
      <pre className="whitespace-pre-wrap tracking-wide opacity-90 group-hover:opacity-100 transition-opacity">
        <span className="text-white/30 mr-2">$</span>
        {output}
      </pre>
      <div className="h-12 w-full absolute bottom-0 left-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
    </div>
  </div>
);

export default TerminalView;
