
import React from 'react';
import { Message, Entity, FileNode } from '../../types';
import RichContent from '../RichContent';
import Avatar from '../ui/Avatar';
import { PERSONAL_AGENT_ID } from '../../constants';
import OptimisticIndicator from './OptimisticIndicator';
import Button from '../ui/Button';

interface MessageItemProps {
  msg: Message;
  sender: Entity;
  isMe: boolean;
  onPreviewFile: (f: FileNode) => void;
  onPreviewTerminal: (t: string, o: string) => void;
  onPreviewWeb: (t: string, u: string) => void;
  onAction: (cmd: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  msg, sender, isMe, onPreviewFile, onPreviewTerminal, onPreviewWeb, onAction 
}) => {
  const isSystem = sender.id === PERSONAL_AGENT_ID;

  return (
    <div className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`w-full max-w-[95%] md:max-w-[85%] lg:max-w-[75%] flex ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isMe && (
          <div className="shrink-0 mt-1">
             <Avatar src={sender.avatar} name={sender.name} isAgent={sender.type === 'agent'} size="md" />
          </div>
        )}
        
        <div className={`flex flex-col ${isMe ? 'mr-0' : 'ml-5'} min-w-0 flex-1`}>
          <div className={`flex items-center gap-3 mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {!isMe && (
              <>
                <span className="text-sm font-semibold text-slate-700">{sender.name}</span>
                <span className="text-xs font-medium text-slate-500">{sender.role || 'Member'}</span>
              </>
            )}
            {isMe && <OptimisticIndicator status={msg.status} />}
          </div>

          <div className={`relative px-4 py-3 rounded-2xl shadow-sm border transition-all ${
            isMe 
              ? 'bg-slate-900 text-white border-slate-800 rounded-tr-md' 
              : (isSystem 
                  ? 'bg-blue-600 border-blue-600 rounded-tl-md text-white' 
                  : 'bg-white border-slate-200 rounded-tl-md text-slate-900')
          }`}>

            <p className={`text-base leading-relaxed whitespace-pre-wrap ${isMe || isSystem ? 'text-white' : 'text-slate-800'}`}>
              {msg.content}
            </p>
            
            {msg.payloads?.map((payload, i) => (
              <RichContent 
                key={i} 
                payload={payload} 
                isMe={isMe} 
                onPreviewFile={onPreviewFile}
                onPreviewTerminal={onPreviewTerminal}
                onPreviewWeb={onPreviewWeb}
              />
            ))}

            {msg.actions && (
              <div className="mt-4 flex flex-wrap gap-2">
                {msg.actions.map((action) => (
                  <Button 
                    key={action.id} 
                    onClick={() => onAction(action.command)}
                    variant={isMe || isSystem ? 'outline' : 'primary'}
                    size="sm"
                    className={`${isMe || isSystem ? 'bg-white/10 border-white/30 text-white hover:bg-white/20' : ''}`}
                    icon={action.icon}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
            
            <div className={`mt-3 pt-2 border-t flex justify-between items-center text-xs ${isMe || isSystem ? 'border-white/10' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                {msg.cost && (
                  <span className={`font-medium ${isMe || isSystem ? 'text-white/50' : 'text-slate-500'}`}>
                    {msg.cost.toFixed(4)} UBL
                  </span>
                )}
              </div>
              <span className={`font-medium ${isMe || isSystem ? 'text-white/40' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
