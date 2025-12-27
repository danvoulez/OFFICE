
import React from 'react';
import { FileNode } from '../../types';
import FileTree from '../FileTree';

interface FilesystemViewProps {
  title?: string;
  files: FileNode[];
  onPreviewFile: (file: FileNode) => void;
  PinButton: React.ReactNode;
}

const FilesystemView: React.FC<FilesystemViewProps> = ({ title, files, onPreviewFile, PinButton }) => (
  <div className="mt-5 rounded-3xl border-2 border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:shadow-xl group">
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-md">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <i className="fas fa-folder-tree text-sm"></i>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">{title || 'FileSystem View'}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Verified Context</span>
        </div>
      </div>
      {PinButton}
    </div>
    <div className="p-6 bg-white">
      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
        <FileTree nodes={files} onSelectFile={onPreviewFile} />
      </div>
    </div>
    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
       <div className="flex items-center">
         <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-3"></div>
         Storage Node Active
       </div>
       <span className="font-mono">{files.length} Entries</span>
    </div>
  </div>
);

export default FilesystemView;
