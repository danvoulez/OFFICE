
import React from 'react';

interface CodeViewProps {
  language: string;
  code: string;
  PinButton: React.ReactNode;
}

const CodeView: React.FC<CodeViewProps> = ({ language, code, PinButton }) => (
  <div className="mt-5 rounded-3xl border-2 border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all">
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-md">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-blue-400">
           <i className="fas fa-file-code text-xs"></i>
        </div>
        <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{language} module</span>
      </div>
      {PinButton}
    </div>
    <div className="flex bg-slate-50/30">
      <div className="w-12 flex flex-col items-center py-6 border-r border-slate-100 select-none opacity-25 bg-slate-50">
        {code.split('\n').slice(0, 15).map((_, i) => (
          <span key={i} className="text-[10px] font-mono leading-7">{i + 1}</span>
        ))}
      </div>
      <div className="flex-1 p-6 overflow-x-auto bg-white">
        <pre className="text-[13px] font-mono text-slate-800 leading-7 tracking-tight">
          <code>{code}</code>
        </pre>
      </div>
    </div>
    <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
      <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Block Signatory Check OK</span>
      <span className="text-[8px] font-mono text-blue-400 opacity-60">UTF-8 SOURCE</span>
    </div>
  </div>
);

export default CodeView;
