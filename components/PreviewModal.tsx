
import React from 'react';
import { FileNode } from '../types';

interface PreviewModalProps {
  item: {
    type: 'code' | 'terminal' | 'web' | 'file';
    title: string;
    content?: string;
    url?: string;
    language?: string;
  };
  onClose: () => void;
  onApprove: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ item, onClose, onApprove }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
      
      <div className="relative w-full max-w-6xl h-full bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col border border-slate-200 animate-slide-up">
        {/* Header Profissional */}
        <div className="bg-white px-8 py-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
              <i className={`fas ${item.type === 'code' || item.type === 'file' ? 'fa-code' : item.type === 'terminal' ? 'fa-terminal' : 'fa-globe'} text-lg`}></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{item.title}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Oversight Preview & Signing Mode</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Área de Visualização */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
          {item.type === 'web' ? (
            <div className="w-full h-full p-6">
              <div className="w-full h-full bg-white border border-slate-200 rounded-xl shadow-inner overflow-hidden">
                <iframe src={item.url} className="w-full h-full" title="Web Monitor" />
              </div>
            </div>
          ) : (
            <div className="w-full h-full overflow-y-auto font-mono text-sm relative">
              <div className="absolute top-0 left-0 w-12 h-full bg-slate-100/50 border-r border-slate-200 flex flex-col items-center py-6 select-none opacity-50">
                {Array.from({ length: 50 }).map((_, i) => (
                  <span key={i} className="text-[10px] text-slate-400 leading-relaxed">{i + 1}</span>
                ))}
              </div>
              <pre className="p-6 pl-16 text-[13px] leading-relaxed text-slate-700">
                <code>{item.content}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Footer de Ação */}
        <div className="px-8 py-6 bg-white border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
             <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <i className="fas fa-file-signature text-xl"></i>
             </div>
             <div className="flex flex-col">
                <p className="text-xs font-bold text-slate-900">Protocol Authorization Required</p>
                <p className="text-[10px] text-slate-500 font-medium">Your signature will commit this block to the universal ledger.</p>
             </div>
          </div>

          <div className="flex items-center space-x-3">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Cancel Review
            </button>
            <button 
              onClick={() => { onApprove(); onClose(); }}
              className="px-10 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
            >
              Sign & Execute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
