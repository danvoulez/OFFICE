
import React, { useMemo, useState } from 'react';
import { Conversation, Message, Entity, MessageType, FileNode, PinnedAsset } from '../types';
import { PERSONAL_AGENT_ID } from '../constants';
import { useProtocol } from '../context/ProtocolContext';
import PreviewModal from './PreviewModal';
import MessageList from './chat/MessageList';
import PinnedAssetBar from './chat/PinnedAssetBar';
import Avatar from './ui/Avatar';
import AddAssetModal from './chat/AddAssetModal';

interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  entities: Entity[];
  currentUser: Entity;
  onSendMessage: (content: string, type?: MessageType) => void;
  onBack?: () => void;
  onInspectEntity: (entity: Entity, initialTab?: 'profile' | 'settings') => void;
  onSummonCore: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  entities,
  currentUser,
  onSendMessage,
  onBack,
  onInspectEntity,
  onSummonCore
}) => {
  const { unpinAsset, pinAsset } = useProtocol();
  const [inputText, setInputText] = useState('');
  const [showAssets, setShowAssets] = useState(true);
  const [previewItem, setPreviewItem] = useState<{ type: 'code' | 'terminal' | 'web' | 'file', title: string, content?: string, url?: string } | null>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);

  const otherParticipantId = !conversation?.isGroup ? conversation?.participants?.find(p => p !== currentUser.id) : null;
  const otherEntity = otherParticipantId ? entities.find(e => e.id === otherParticipantId) : null;
  
  const chatName = conversation?.isGroup ? conversation.name : (otherEntity?.name || 'Unknown');
  const chatAvatar = conversation?.isGroup ? conversation.avatar : otherEntity?.avatar;
  const isCoreChat = !conversation?.isGroup && conversation?.participants?.includes(PERSONAL_AGENT_ID);

  const headerSubtitle = useMemo(() => {
    if (conversation.isGroup) return `${conversation.participants.length} participants • Active`;
    return 'Active';
  }, [conversation]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-slate-300 mb-4"></i>
          <p className="text-sm text-slate-500 font-medium">Conversation not found</p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText, 'chat');
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <header className="h-16 flex items-center px-4 bg-white border-b border-slate-200 z-20 shrink-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center min-w-0 gap-3">
            {onBack && (
              <button onClick={onBack} className="md:hidden text-slate-400 hover:text-slate-600">
                <i className="fas fa-chevron-left"></i>
              </button>
            )}
            
            <div className="shrink-0 cursor-pointer" onClick={() => {
              if (!conversation.isGroup && otherEntity) onInspectEntity(otherEntity, 'profile');
            }}>
              {conversation.isGroup ? (
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <i className="fas fa-users text-sm"></i>
                </div>
              ) : (
                <Avatar src={chatAvatar || ''} name={chatName || ''} isAgent={otherEntity?.type === 'agent'} size="md" />
              )}
            </div>

            <div className="flex flex-col min-w-0 cursor-pointer" onClick={() => {
              if (!conversation.isGroup && otherEntity) onInspectEntity(otherEntity, 'profile');
            }}>
              <h1 className="text-base font-semibold text-slate-900 truncate">{chatName}</h1>
              <p className="text-xs text-slate-500">{headerSubtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAssets((p) => !p)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${showAssets ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700'}`}
              title={showAssets ? 'Hide pinned context' : 'Show pinned context'}
            >
              <i className="fas fa-paperclip text-sm"></i>
            </button>
            <button
              onClick={() => setShowAddAsset(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border bg-white text-slate-400 border-slate-200 hover:text-slate-700 transition-all"
              title="Pin an asset"
            >
              <i className="fas fa-thumbtack text-sm"></i>
            </button>
            {isCoreChat && (
              <button 
                onClick={onSummonCore} 
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
              >
                Ask Assistant
              </button>
            )}
          </div>
        </div>
      </header>

      {showAssets && (
        <PinnedAssetBar 
          assets={conversation.pinnedAssets || []} 
          onUnpin={(id) => unpinAsset(conversation.id, id)}
          onPreview={(asset) => {
            if (asset.type === 'link' && asset.url) {
              setPreviewItem({ type: 'web', title: asset.title, url: asset.url });
              return;
            }
            if (asset.type === 'code' && asset.content) {
              setPreviewItem({ type: 'code', title: asset.title, content: asset.content });
              return;
            }
            if (asset.type === 'file' && asset.content) {
              setPreviewItem({ type: 'file', title: asset.title, content: asset.content });
              return;
            }
          }}
        />
      )}

      {/* Messages */}
      <MessageList 
        messages={messages}
        entities={entities}
        currentUser={currentUser}
        onPreviewFile={(f) => setPreviewItem({ type: 'file', title: f.name, content: f.content })}
        onPreviewTerminal={(t, o) => setPreviewItem({ type: 'terminal', title: t, content: o })}
        onPreviewWeb={(t, u) => setPreviewItem({ type: 'web', title: t, url: u })}
        onAction={onSendMessage}
      />

      {/* Input */}
      <footer className="p-6 bg-white border-t border-slate-50 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:bg-white focus-within:ring-8 focus-within:ring-blue-500/5 transition-all">
            <button
              onClick={() => setShowAddAsset(true)}
              className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors"
              title="Attach / Pin context"
            >
              <i className="fas fa-plus text-lg"></i>
            </button>
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Submit context-aware command..."
              aria-label="Message input"
              rows={1}
              className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 font-medium py-3 resize-none"
            />
            <button 
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-20"
            >
              <i className="fas fa-paper-plane text-sm"></i>
            </button>
          </div>
        </div>
      </footer>

      {previewItem && (
        <PreviewModal 
          item={previewItem} 
          onClose={() => setPreviewItem(null)} 
          onApprove={() => onSendMessage(`✅ [EXECUTIVE_OVERSIGHT] Approved & Signed: ${previewItem.title}`, 'agreement')}
        />
      )}

      {showAddAsset && (
        <AddAssetModal
          onClose={() => setShowAddAsset(false)}
          onPin={async (asset) => {
            await pinAsset(conversation.id, asset);
            setShowAssets(true);
            setShowAddAsset(false);
          }}
        />
      )}
    </div>
  );
};

export default ChatWindow;
