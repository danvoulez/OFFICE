
import React, { useRef, useEffect } from 'react';
import { Message, Entity, FileNode } from '../../types';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  entities: Entity[];
  currentUser: Entity;
  onPreviewFile: (f: FileNode) => void;
  onPreviewTerminal: (t: string, o: string) => void;
  onPreviewWeb: (t: string, u: string) => void;
  onAction: (cmd: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, entities, currentUser, ...handlers 
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col space-y-8 bg-slate-50/40">
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center opacity-20">
          <i className="fas fa-comments text-5xl mb-4"></i>
          <p className="text-sm font-semibold text-slate-500">End-to-end encrypted session</p>
        </div>
      )}
      {messages.map((msg) => (
        <MessageItem 
          key={msg.id} 
          msg={msg} 
          sender={entities.find(e => e.id === msg.from) || currentUser}
          isMe={msg.from === currentUser.id}
          {...handlers}
        />
      ))}
      <div ref={endRef} className="h-4 shrink-0" />
    </div>
  );
};

export default MessageList;
