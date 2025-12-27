
import React from 'react';

interface WebViewProps {
  title: string;
  url: string;
  onPreview: () => void;
  PinButton: React.ReactNode;
}

const WebView: React.FC<WebViewProps> = ({ title, url, onPreview, PinButton }) => (
  <div 
    className="mt-5 rounded-3xl border-2 border-slate-200 bg-white p-6 flex items-center space-x-5 cursor-pointer hover:shadow-2xl hover:border-blue-500/30 transition-all group"
    onClick={onPreview}
  >
    <div className="w-16 h-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-blue-600 shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-500">
      <i className="fas fa-globe text-2xl"></i>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center mb-1">
        <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] bg-blue-500/5 px-2 py-0.5 rounded mr-3">External Protocol</span>
        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Safe Link</span>
      </div>
      <h4 className="text-[15px] font-black text-slate-900 truncate tracking-tight">{title}</h4>
      <p className="text-[11px] text-slate-400 font-mono truncate mt-1 opacity-70">{url}</p>
    </div>
    <div className="flex flex-col items-center space-y-2 shrink-0">
      {PinButton}
      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
        <i className="fas fa-arrow-up-right-from-square text-[10px]"></i>
      </div>
    </div>
  </div>
);

export default WebView;
