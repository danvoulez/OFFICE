
export type EntityId = string;
export type GroupId = string;
export type TenantId = string;

export type EntityType = 'human' | 'agent' | 'system';
export type MessageStatus = 'pending' | 'signed' | 'broadcasted' | 'failed';
export type MessageType = 'chat' | 'command' | 'agreement' | 'system_alert';

export interface Tenant {
  id: TenantId;
  name: string;
  domain: string;
  tier: 'free' | 'enterprise' | 'sovereign';
  createdAt: Date;
  // Optional backend-provided metadata
  status?: string;
  namespaceHash?: string;
  inviteCode?: string;
}

export interface UserSession {
  user: Entity;
  tenant: Tenant;
  token: string;
}

export interface PinnedAsset {
  id: string;
  type: 'file' | 'link' | 'code';
  title: string;
  url?: string;
  content?: string; // for code/file quick preview
  language?: string;
  refId?: string; // ID da mensagem original
}

export interface UserSettings {
  theme: 'light' | 'dark';
  fontSize: 'sm' | 'md' | 'lg';
  audioEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface MessageAction {
  id: string;
  label: string;
  icon?: string;
  command: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
}

export interface FileNode {
  name: string;
  type: 'file' | 'dir';
  size?: string;
  content?: string;
  language?: string;
  children?: FileNode[];
}

export interface RichPayload {
  type: 'code' | 'alert' | 'filesystem' | 'terminal' | 'web';
  title?: string;
  description?: string;
  url?: string;
  meta?: any;
  files?: FileNode[];
  output?: string;
}

export interface Entity {
  id: EntityId;
  name: string;
  avatar: string;
  type: EntityType;
  status: 'online' | 'offline' | 'working' | 'typing';
  about: string;
  phone: string;
  role?: string;
  constitution?: {
    personality: string;
    capabilities: string[];
    quirks: string[];
  };
}

export interface Message {
  id: string;
  from: EntityId;
  to: EntityId | GroupId;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  hash: string;
  type: MessageType;
  cost?: number;
  payloads?: RichPayload[];
  actions?: MessageAction[];
  signatories?: EntityId[]; // Quem assinou este bloco
  error?: string;
}

export interface Conversation {
  id: string;
  participants: EntityId[];
  isGroup: boolean;
  name?: string;
  avatar?: string;
  lastMessage?: string;
  unreadCount: number;
  pinnedAssets?: PinnedAsset[];
}
