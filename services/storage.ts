
import { Message, Conversation } from '../types';

const STORAGE_KEYS = {
  MESSAGES: 'ubl_ledger_messages',
  CONVERSATIONS: 'ubl_ledger_conversations',
  ENTITIES: 'ubl_entities_v1'
};

export class StorageService {
  static saveMessages(messages: Message[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to persist messages', e);
    }
  }

  static loadMessages(): Message[] {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    } catch {
      return [];
    }
  }

  static saveConversations(convs: Conversation[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(convs));
    } catch (e) {
      console.error('Failed to persist conversations', e);
    }
  }

  static loadConversations(): Conversation[] | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to load conversations', e);
      return null;
    }
  }
}
