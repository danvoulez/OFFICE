import { api } from './apiClient';
import type { Conversation, Entity, Message, MessageType, Tenant, UserSession, PinnedAsset, UserSettings } from '../types';

type JsonMessage = Omit<Message, 'timestamp'> & { timestamp: string };
type JsonTenant = Omit<Tenant, 'createdAt'> & { createdAt: string };
type JsonSession = Omit<UserSession, 'tenant'> & { tenant: JsonTenant };

function reviveMessage(m: JsonMessage): Message {
  return { ...m, timestamp: new Date(m.timestamp) };
}

function reviveTenant(t: JsonTenant): Tenant {
  return { ...t, createdAt: new Date(t.createdAt) };
}

function reviveSession(s: JsonSession): UserSession {
  return { ...s, tenant: reviveTenant(s.tenant) };
}

export type BootstrapResponse = {
  entities: Entity[];
  conversations: Conversation[];
  messages: JsonMessage[];
};

export type SendMessageResponse = {
  messages: Message[];
  ledgerLogs?: Array<{ hash: string; cost: number; node: string }>;
  conversation?: Conversation;
};

type SendMessageResponseJson = {
  messages: JsonMessage[];
  ledgerLogs?: Array<{ hash: string; cost: number; node: string }>;
  conversation?: Conversation;
};

export const ublApi = {
  async health() {
    return api.get<{ ok: true }>(`/api/health`);
  },

  async provisionTenant(name: string, domain: string): Promise<Tenant> {
    const t = await api.post<JsonTenant>(`/api/tenant/provision`, { name, domain });
    return reviveTenant(t);
  },

  async joinTenant(inviteCode: string): Promise<Tenant> {
    const t = await api.post<JsonTenant>(`/api/tenant/join`, { inviteCode });
    return reviveTenant(t);
  },

  async createSession(input: { tenantId: string; user: Partial<Entity> }): Promise<UserSession> {
    const s = await api.post<JsonSession>(`/api/session`, input);
    return reviveSession(s);
  },

  async getMe(): Promise<Entity> {
    return api.get<Entity>(`/api/me`);
  },

  async updateMe(patch: Partial<Entity>): Promise<Entity> {
    return api.put<Entity>(`/api/me`, patch);
  },

  async getSettings(): Promise<UserSettings> {
    return api.get<UserSettings>(`/api/settings`);
  },

  async updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
    return api.put<UserSettings>(`/api/settings`, patch);
  },

  async bootstrap(): Promise<{ entities: Entity[]; conversations: Conversation[]; messages: Message[] }> {
    const res = await api.get<BootstrapResponse>(`/api/bootstrap`);
    return {
      entities: res.entities,
      conversations: res.conversations,
      messages: res.messages.map(reviveMessage)
    };
  },

  async listEntities(): Promise<Entity[]> {
    return api.get<Entity[]>(`/api/entities`);
  },

  async createEntity(entity: Entity): Promise<Entity> {
    return api.post<Entity>(`/api/entities`, { entity });
  },

  async listConversations(): Promise<Conversation[]> {
    return api.get<Conversation[]>(`/api/conversations`);
  },

  async createConversation(input: { participants: string[]; name?: string; isGroup?: boolean }): Promise<Conversation> {
    return api.post<Conversation>(`/api/conversations`, input);
  },

  async sendMessage(input: { conversationId: string; content: string; type: MessageType }): Promise<SendMessageResponse> {
    const res = await api.post<SendMessageResponseJson>(`/api/messages`, input);
    return {
      ...res,
      messages: res.messages.map(reviveMessage)
    };
  },

  async pinAsset(input: { conversationId: string; asset: Omit<PinnedAsset, 'id'> }): Promise<Conversation> {
    return api.post<Conversation>(`/api/assets/pin`, input);
  },

  async unpinAsset(input: { conversationId: string; assetId: string }): Promise<Conversation> {
    return api.post<Conversation>(`/api/assets/unpin`, input);
  },

  async ledgerLogs(): Promise<{ logs: Array<{ id: string; hash: string; cost: number; node: string; ts: string }>; stats: any }>{
    return api.get(`/api/ledger/logs`);
  }
};
