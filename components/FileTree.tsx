
import React, { useState } from 'react';
import { FileNode } from '../types';

interface FileTreeProps {
  nodes: FileNode[];
  onSelectFile: (file: FileNode) => void;
  level?: number;
}

const FileTree: React.FC<FileTreeProps> = ({ nodes, onSelectFile, level = 0 }) => {
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});

  const toggleDir = (name: string) => {
    setExpandedDirs(prev => ({ ...prev, [name]: !prev[name] }));
  };

  if (!nodes || nodes.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-slate-400 italic">
        No files available
      </div>
    );
  }

  return (
    <div className="flex flex-col select-none">
      {nodes.map((node, idx) => {
        const isDir = node.type === 'dir';
        const isExpanded = expandedDirs[node.name];
        const paddingLeft = level * 16;

        return (
          <div key={`${node.name}-${idx}`}>
            <div 
              className={`flex items-center py-1 px-2 rounded hover:bg-black/5 cursor-pointer group transition-colors`}
              style={{ paddingLeft: paddingLeft + 4 }}
              onClick={() => isDir ? toggleDir(node.name) : onSelectFile(node)}
            >
              <i className={`fas ${isDir ? (isExpanded ? 'fa-folder-open text-amber-400' : 'fa-folder text-amber-400') : 'fa-file-code text-blue-400'} mr-2 w-4 text-center text-[10px]`}></i>
              <span className="text-[12px] font-bold text-gray-700 flex-1 truncate">{node.name}</span>
              {node.size && <span className="text-[9px] font-black text-gray-400 uppercase ml-2 opacity-0 group-hover:opacity-100">{node.size}</span>}
            </div>
            {isDir && isExpanded && node.children && (
              <FileTree nodes={node.children} onSelectFile={onSelectFile} level={level + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FileTree;
