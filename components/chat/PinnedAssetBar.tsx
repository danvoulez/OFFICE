
import React from 'react';
import { PinnedAsset } from '../../types';

interface PinnedAssetBarProps {
  assets: PinnedAsset[];
  onUnpin: (id: string) => void;
  onPreview: (asset: PinnedAsset) => void;
}

const PinnedAssetBar: React.FC<PinnedAssetBarProps> = ({ assets, onUnpin, onPreview }) => {
  if (assets.length === 0) return null;

  return (
    <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center space-x-4 overflow-x-auto animate-fade-in no-scrollbar shrink-0">
      <div className="flex items-center space-x-2 shrink-0 pr-4 border-r border-slate-200">
        <i className="fas fa-paperclip text-[10px] text-slate-400"></i>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pinned Context:</span>
      </div>
      
      <div className="flex items-center space-x-3">
        {assets.map(asset => (
          <div 
            key={asset.id} 
            className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shrink-0 group hover:border-blue-400 transition-all shadow-sm cursor-pointer"
            onClick={() => onPreview(asset)}
          >
            <i className={`fas ${
              asset.type === 'file' ? 'fa-file-pdf text-red-500' : 
              asset.type === 'link' ? 'fa-link text-blue-500' : 
              'fa-code text-emerald-500'
            } text-[10px] mr-2`}></i>
            
            <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]">{asset.title}</span>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onUnpin(asset.id);
              }}
              className="ml-2 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
            >
              <i className="fas fa-times text-[8px]"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PinnedAssetBar;
