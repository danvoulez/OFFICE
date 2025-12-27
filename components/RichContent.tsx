
import React from 'react';
import { RichPayload, FileNode } from '../types';
import { useProtocol } from '../context/ProtocolContext';

// Novos componentes modulares refinados
import FilesystemView from './rich/FilesystemView';
import TerminalView from './rich/TerminalView';
import CodeView from './rich/CodeView';
import WebView from './rich/WebView';
import AlertView from './rich/AlertView';

interface RichContentProps {
  payload: RichPayload;
  isMe: boolean;
  onPreviewFile?: (file: FileNode) => void;
  onPreviewTerminal?: (title: string, output: string) => void;
  onPreviewWeb?: (title: string, url: string) => void;
}

const RichContent: React.FC<RichContentProps> = ({ 
  payload, 
  isMe, 
  onPreviewFile,
  onPreviewTerminal,
  onPreviewWeb
}) => {
  const { pinAsset, activeConvId } = useProtocol();

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeConvId) return;

    let assetType: 'file' | 'link' | 'code' = 'file';
    if (payload.type === 'web') assetType = 'link';
    if (payload.type === 'code') assetType = 'code';

    pinAsset(activeConvId, {
      type: assetType,
      title: payload.title || 'Attached Asset',
      url: payload.url
    });
  };

  const PinButton = (
    <button 
      onClick={handlePin}
      title="Pin to Context"
      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
        isMe 
          ? 'hover:bg-white/10 text-white/40 hover:text-white' 
          : 'hover:bg-blue-50 text-slate-300 hover:text-blue-500'
      }`}
    >
      <i className="fas fa-thumbtack text-[11px]"></i>
    </button>
  );

  switch (payload.type) {
    case 'filesystem':
      return payload.files ? (
        <FilesystemView 
          title={payload.title}
          files={payload.files}
          onPreviewFile={onPreviewFile!}
          PinButton={PinButton}
        />
      ) : null;

    case 'terminal':
      return (
        <TerminalView 
          title={payload.title}
          output={payload.output || ''}
          onExpand={() => onPreviewTerminal!(payload.title || 'Session', payload.output || '')}
          PinButton={PinButton}
        />
      );

    case 'code':
      return (
        <CodeView 
          language={payload.meta?.language || 'plain_text'}
          code={payload.meta?.code || ''}
          PinButton={PinButton}
        />
      );

    case 'web':
      return (
        <WebView 
          title={payload.title || 'Web Resource'}
          url={payload.url || '#'}
          onPreview={() => onPreviewWeb!(payload.title || 'Web Target', payload.url || '')}
          PinButton={PinButton}
        />
      );

    case 'alert':
      return (
        <AlertView 
          title={payload.title || 'Protocol Alert'}
          description={payload.description || ''}
          priority={payload.meta?.priority || 'info'}
        />
      );

    default:
      return null;
  }
};

export default RichContent;
