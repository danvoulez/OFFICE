
import React, { useState } from 'react';
import { ProtocolProvider, useProtocol } from './context/ProtocolContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { OnboardingProvider, useOnboarding } from './context/OnboardingContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ProfileDrawer from './components/ProfileDrawer';
import NewEntityModal from './components/NewEntityModal';
import ProtocolMonitor from './components/ProtocolMonitor';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import AssistantOverlay from './components/AssistantOverlay';
import { PERSONAL_AGENT_ID } from './constants';

const MainLayout: React.FC = () => {
  const { 
    entities, 
    conversations, 
    messages, 
    activeConvId, 
    setActiveConvId, 
    dispatchMessage,
    addEntity,
    updateEntity,
    createConversation
  } = useProtocol();

  const { session, step, updateMe } = useOnboarding();
  const { notify } = useNotifications();
  const [inspectEntity, setInspectEntity] = useState<{ entity: any; initialTab?: 'profile' | 'settings' } | null>(null);
  const [showNewEntity, setShowNewEntity] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);

  if (step !== 'ready' || !session) {
    return <OnboardingFlow />;
  }

  const activeConversation = conversations.find(c => c.id === activeConvId);
  const coreAgent = entities.find(e => e.id === PERSONAL_AGENT_ID);

  const currentChatMessages = messages.filter(m => {
    if (!activeConversation) return false;
    if (activeConversation.isGroup) return m.to === activeConversation.id;
    const otherParticipant = activeConversation.participants.find(p => p !== session.user.id);
    return (m.from === session.user.id && m.to === otherParticipant) || 
           (m.from === otherParticipant && m.to === session.user.id);
  });

  const handleCreateRequest = (data: any) => {
    if (data.entity) {
      addEntity(data.entity);
    }
    
    if (data.participants) {
      createConversation(data.participants, data.name, data.isGroup);
    }
    
    setShowNewEntity(false);
    notify({
      type: 'success',
      title: 'Context Sync Initiated',
      message: data.isGroup ? 'Strategic group provisioned.' : 'Direct channel encrypted.'
    });
  };

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-main)] overflow-hidden font-sans animate-fade-in text-[var(--text-main)] transition-colors duration-300">
      <div className={`${activeConvId ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] lg:w-[400px]`}>
        <Sidebar 
          conversations={conversations} 
          activeConvId={activeConvId} 
          onSelectConv={setActiveConvId} 
          entities={entities} 
          currentUser={session.user} 
          onToggleStatus={async () => {
            try {
              const nextStatus = session.user.status === 'away' ? 'online' : 'away';
              const updated = await updateMe({ status: nextStatus });
              await updateEntity(updated);
              notify({ type: 'success', title: 'Status Updated', message: `Now ${nextStatus}.` });
            } catch (e: any) {
              notify({ type: 'error', title: 'Status Failed', message: e.message || 'Unable to update status.' });
            }
          }} 
          onInspectEntity={(entity, initialTab) => setInspectEntity({ entity, initialTab })}
          onNewEntity={() => setShowNewEntity(true)} 
        />
      </div>

      <main className={`flex-1 flex flex-col relative bg-[var(--bg-card)] md:bg-transparent ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
        {activeConvId ? (
          <ChatWindow 
            conversation={activeConversation!} 
            messages={currentChatMessages} 
            entities={entities} 
            currentUser={session.user} 
            onSendMessage={dispatchMessage} 
            onReact={() => {}} 
            onBack={() => setActiveConvId(null)} 
            onInspectEntity={(entity, initialTab) => setInspectEntity({ entity, initialTab })}
            onSummonCore={() => setShowAssistant(true)} 
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 border border-[var(--border-primary)] rounded-[2.5rem] flex items-center justify-center mb-8 text-[var(--text-muted)] shadow-xl transition-all hover:scale-105 hover:rotate-3">
               <i className="fas fa-lock text-3xl"></i>
            </div>
            <div className="space-y-3">
               <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-[0.3em]">{session.tenant.name}</h2>
               <p className="text-[10px] text-blue-500 font-mono font-black">{session.tenant.domain.toUpperCase()}.UBL.NETWORK</p>
            </div>
            <div className="max-w-xs mt-10">
              <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed italic opacity-70">
                Universal Business Ledger active. Select a secure workstream to synchronize context-aware execution.
              </p>
            </div>
          </div>
        )}

        {showAssistant && coreAgent && (
          <AssistantOverlay 
            assistant={coreAgent} 
            contextName={activeConversation?.name || 'Active Session'}
            onClose={() => setShowAssistant(false)}
            onAction={(cmd) => {
              dispatchMessage(cmd);
              setShowAssistant(false);
            }}
          />
        )}
      </main>

      <ProtocolMonitor />
      {inspectEntity && (
        <ProfileDrawer 
          entity={inspectEntity.entity} 
          initialTab={inspectEntity.initialTab}
          onClose={() => setInspectEntity(null)} 
        />
      )}
      {showNewEntity && <NewEntityModal onClose={() => setShowNewEntity(false)} onCreate={handleCreateRequest} />}
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <NotificationProvider>
      <OnboardingProvider>
        <ProtocolProvider>
          <MainLayout />
        </ProtocolProvider>
      </OnboardingProvider>
    </NotificationProvider>
  </ThemeProvider>
);

export default App;
