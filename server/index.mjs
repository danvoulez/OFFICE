import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Optional: Gemini server-side (keeps API key off the browser)
let GoogleGenAI = null;
try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const mod = await import('@google/genai');
  GoogleGenAI = mod.GoogleGenAI;
} catch {
  // If dependency isn't installed, agent responses will gracefully fall back to a stub.
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Load env vars for the backend.
// Supports any of these locations (later files override earlier ones):
//   - .env
//   - .env.local
//   - server/.env
//   - server/.env.local
// This keeps dev DX smooth while still being compatible with typical hosting.
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'server', '.env'),
  path.resolve(process.cwd(), 'server', '.env.local')
];
for (const file of envCandidates) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file, override: true });
  }
}

const PORT = Number(process.env.PORT || 8787);
const DATA_PATH = process.env.UBL_DATA_PATH
  ? path.resolve(process.env.UBL_DATA_PATH)
  : path.resolve(process.cwd(), 'server', 'data', 'db.json');

const PERSONAL_AGENT_ID = 'agent-core';

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJsonSafe(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonSafe(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 32).toUpperCase();
}

function generateHash(content) {
  return `0X${sha256Hex(content + ':' + Date.now() + ':' + Math.random())}`;
}

function calculateCost(content, isAgent) {
  const base = isAgent ? 0.0004 : 0.0001;
  const complexity = String(content || '').length * 0.000005;
  return Number((base + complexity).toFixed(8));
}

function seedDb() {
  const tenantId = 'tenant-demo';
  return {
    tenants: {
      [tenantId]: {
        id: tenantId,
        name: 'UBL Demo Organization',
        domain: 'ubl.global',
        createdAt: nowIso(),
        status: 'active',
        namespaceHash: '0xA1B2C3D4E5F6',
        inviteCode: 'JOIN'
      }
    },
    entities: {
      [PERSONAL_AGENT_ID]: {
        id: PERSONAL_AGENT_ID,
        name: 'UBL Core',
        role: 'System Architect',
        avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Core&backgroundColor=0d9488',
        type: 'agent',
        status: 'online',
        about: 'I am the UBL operating system personified.',
        phone: 'CORE-SYS-001',
        constitution: {
          personality: 'You are UBL Core. Concise, technical, and proactive. Use shortcuts.',
          capabilities: ['automation', 'ledger audit'],
          quirks: ['Responds with action buttons']
        }
      },
      'agent-sofia': {
        id: 'agent-sofia',
        name: 'Sofia Marketing',
        role: 'Marketing AI',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sofia',
        type: 'agent',
        status: 'online',
        about: 'Growth specialist.',
        phone: 'UBL-AGENT-001',
        constitution: {
          personality: 'Sofia. Growth-focused. ROI priority.',
          capabilities: ['copywriting', 'analytics'],
          quirks: ['Quotes metrics']
        }
      },
      'user-carlos': {
        id: 'user-carlos',
        name: 'Carlos Tech',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
        type: 'human',
        status: 'online',
        about: 'Lead Developer',
        phone: '+55 11 99999-1111',
        role: 'Engineer'
      },
      'user-maria': {
        id: 'user-maria',
        name: 'Maria Diretora',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
        type: 'human',
        status: 'offline',
        about: 'Director of Operations',
        phone: '+55 11 97777-7777',
        role: 'Director'
      },
      'user-ana': {
        id: 'user-ana',
        name: 'Ana Sales',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
        type: 'human',
        status: 'offline',
        about: 'VP of Sales',
        phone: '+55 11 99999-2222',
        role: 'Executive'
      }
    },
    conversations: {},
    messages: {},
    ledgerLogs: [],
    userSettings: {}
  };
}

let db = readJsonSafe(DATA_PATH, null);
if (!db) {
  db = seedDb();
  writeJsonSafe(DATA_PATH, db);
}

function persist() {
  writeJsonSafe(DATA_PATH, db);
}

function fail(res, status, error, details) {
  return res.status(status).json({ error, ...(details ? { details } : {}) });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+(.+)$/.exec(h);
  if (!m) return fail(res, 401, 'Missing Authorization header');
  const token = m[1];
  const parts = token.split(':');
  if (parts[0] !== 'ubl' || !parts[1]) return fail(res, 401, 'Invalid token');
  req.userId = parts[1];
  return next();
}

function listConversationsForUser(userId) {
  return Object.values(db.conversations).filter((c) => c?.participants?.includes(userId));
}

function listMessagesForConversation(conv, userId) {
  if (!conv) return [];
  if (conv.isGroup) {
    return Object.values(db.messages).filter((m) => m.to === conv.id);
  }
  const other = conv.participants.find((p) => p !== userId);
  return Object.values(db.messages).filter(
    (m) =>
      (m.from === userId && m.to === other) ||
      (m.from === other && m.to === userId)
  );
}

function computeLedgerStats() {
  const logs = db.ledgerLogs || [];
  const windowMs = 60_000;
  const now = Date.now();
  const inWindow = logs.filter((l) => now - new Date(l.ts).getTime() <= windowMs);
  const tps = inWindow.length / 60;
  const totalCost = Object.values(db.messages).reduce((acc, m) => acc + (Number(m.cost) || 0), 0);
  // Smooth little bar graph, stable-ish
  const healthPoints = Array(20)
    .fill(0)
    .map((_, i) => {
      const base = 45 + Math.sin((i + now / 2000) / 2) * 18;
      const load = Math.min(20, tps * 6);
      return Math.max(10, Math.min(90, Math.round(base + load)));
    });
  return {
    tps: Number(tps.toFixed(2)),
    peers: 12,
    totalCost: Number(totalCost.toFixed(6)),
    healthPoints
  };
}

async function generateAgentReply({ agentId, userId, content }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || !GoogleGenAI) {
    return `🤖 (${agentId}) I received: “${content}”.\n\n(GEMINI_API_KEY not configured on server — returning stub.)`;
  }
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You are an assistant inside a messenger called UBL Protocol. Be concise, helpful, and practical.\n\nUser: ${content}`;
  const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return res.text || '…';
}

function upsertConversation(conv) {
  db.conversations[conv.id] = conv;
}

function addMessage(m) {
  db.messages[m.id] = m;
  const log = { id: `log-${Date.now()}-${Math.random().toString(16).slice(2)}`, hash: m.hash, cost: m.cost, node: 'UBL_MAINNET_NODE_07', ts: nowIso() };
  db.ledgerLogs.unshift(log);
  db.ledgerLogs = db.ledgerLogs.slice(0, 200);
  return log;
}

// --- Routes

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/tenant/provision', (req, res) => {
  const { name, domain } = req.body || {};
  if (!name || !domain) return fail(res, 400, 'Missing name/domain');
  const id = `tenant-${Date.now()}`;
  const tenant = {
    id,
    name,
    domain,
    createdAt: nowIso(),
    status: 'active',
    namespaceHash: `0x${sha256Hex(domain).slice(0, 12)}`,
    inviteCode: `INV-${Math.random().toString(16).slice(2, 6).toUpperCase()}`
  };
  db.tenants[id] = tenant;
  persist();
  return res.json(tenant);
});

app.post('/api/tenant/join', (req, res) => {
  const { inviteCode } = req.body || {};
  if (!inviteCode) return fail(res, 400, 'Missing inviteCode');
  const t = Object.values(db.tenants).find((x) => x.inviteCode === inviteCode) || db.tenants['tenant-demo'];
  if (!t) return fail(res, 404, 'Tenant not found');
  return res.json(t);
});

app.post('/api/session', (req, res) => {
  const { tenantId, user } = req.body || {};
  const tenant = db.tenants[tenantId] || db.tenants['tenant-demo'];
  if (!tenant) return fail(res, 400, 'Invalid tenantId');

  const userId = user?.id || `user-${Date.now()}`;
  const entity = {
    id: userId,
    name: user?.name || 'New User',
    role: user?.role || 'Member',
    avatar: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || userId)}`,
    type: 'human',
    status: 'online',
    about: user?.about || '',
    phone: user?.phone || ''
  };
  db.entities[userId] = entity;

  // Ensure default conversations exist for this user
  const existing = listConversationsForUser(userId);
  if (existing.length === 0) {
    const coreConv = {
      id: `conv-core-${userId}`,
      participants: [userId, PERSONAL_AGENT_ID],
      isGroup: false,
      unreadCount: 1,
      lastMessage: '🔔 2 Critical notifications curated.'
    };
    upsertConversation(coreConv);

    const board = {
      id: `group-board-${userId}`,
      participants: [userId, 'agent-sofia', 'user-maria'],
      isGroup: true,
      name: 'UBL Strategic Board 🏛️',
      avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Board',
      unreadCount: 0,
      lastMessage: 'Sofia: KPI report ready for review.'
    };
    upsertConversation(board);

    // Welcome messages
    const m1 = {
      id: `tx-${Date.now()}-1`,
      from: PERSONAL_AGENT_ID,
      to: userId,
      content: `Welcome to UBL Protocol. Your organization namespace "${tenant.domain}" is now active.`,
      timestamp: nowIso(),
      status: 'broadcasted',
      hash: generateHash('welcome'),
      type: 'system_alert',
      cost: calculateCost('welcome', true)
    };
    addMessage(m1);
  }

  persist();

  return res.json({
    token: `ubl:${userId}`,
    tenant,
    user: entity
  });
});

app.get('/api/bootstrap', authMiddleware, (req, res) => {
  const userId = req.userId;
  const convs = listConversationsForUser(userId);

  // Entities: include participants of visible conversations
  const entityIds = new Set();
  convs.forEach((c) => c.participants.forEach((p) => entityIds.add(p)));
  // Always include a small discovery pool for UX
  Object.keys(db.entities).forEach((id) => entityIds.add(id));

  const entities = Array.from(entityIds)
    .map((id) => db.entities[id])
    .filter(Boolean);

  const messages = convs
    .flatMap((c) => listMessagesForConversation(c, userId))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return res.json({ entities, conversations: convs, messages });
});

// --- Account & Settings

app.get('/api/me', authMiddleware, (req, res) => {
  const user = db.entities[req.userId];
  if (!user) return fail(res, 404, 'User not found');
  return res.json(user);
});

app.put('/api/me', authMiddleware, (req, res) => {
  const userId = req.userId;
  const existing = db.entities[userId];
  if (!existing) return fail(res, 404, 'User not found');
  const patch = req.body || {};
  const next = {
    ...existing,
    ...(typeof patch.name === 'string' ? { name: patch.name } : {}),
    ...(typeof patch.role === 'string' ? { role: patch.role } : {}),
    ...(typeof patch.phone === 'string' ? { phone: patch.phone } : {}),
    ...(typeof patch.about === 'string' ? { about: patch.about } : {}),
    ...(typeof patch.avatar === 'string' ? { avatar: patch.avatar } : {}),
    ...(typeof patch.status === 'string' ? { status: patch.status } : {})
  };
  db.entities[userId] = next;
  persist();
  return res.json(next);
});

app.get('/api/settings', authMiddleware, (req, res) => {
  db.userSettings = db.userSettings || {};
  const userId = req.userId;
  const s = (db.userSettings && db.userSettings[userId]) || {
    theme: 'light',
    fontSize: 'md',
    audioEnabled: true,
    notificationsEnabled: true
  };
  return res.json(s);
});

app.put('/api/settings', authMiddleware, (req, res) => {
  db.userSettings = db.userSettings || {};
  const userId = req.userId;
  const patch = req.body || {};
  const prev = (db.userSettings && db.userSettings[userId]) || {};
  const next = {
    ...prev,
    ...(patch && typeof patch === 'object' ? patch : {})
  };
  db.userSettings[userId] = next;
  persist();
  return res.json(next);
});

app.get('/api/entities', authMiddleware, (_req, res) => {
  return res.json(Object.values(db.entities));
});

app.post('/api/entities', authMiddleware, (req, res) => {
  const { entity } = req.body || {};
  if (!entity?.id) return fail(res, 400, 'Missing entity');
  db.entities[entity.id] = entity;
  persist();
  return res.json(entity);
});

app.get('/api/conversations', authMiddleware, (req, res) => {
  return res.json(listConversationsForUser(req.userId));
});

app.post('/api/conversations', authMiddleware, (req, res) => {
  const { participants, name, isGroup } = req.body || {};
  if (!Array.isArray(participants) || participants.length < 2) return fail(res, 400, 'participants must have at least 2');
  const id = `conv-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
  const conv = {
    id,
    participants: Array.from(new Set(participants)),
    isGroup: Boolean(isGroup),
    ...(isGroup ? { name: name || 'New Group', avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${id}` } : {}),
    unreadCount: 0,
    lastMessage: ''
  };
  upsertConversation(conv);
  persist();
  return res.json(conv);
});

app.post('/api/assets/pin', authMiddleware, (req, res) => {
  const { conversationId, asset } = req.body || {};
  const conv = db.conversations[conversationId];
  if (!conv) return fail(res, 404, 'Conversation not found');
  const pinned = conv.pinnedAssets || [];
  const newAsset = { id: `asset-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, ...asset };
  conv.pinnedAssets = [newAsset, ...pinned].slice(0, 8);
  upsertConversation(conv);
  persist();
  return res.json(conv);
});

app.post('/api/assets/unpin', authMiddleware, (req, res) => {
  const { conversationId, assetId } = req.body || {};
  const conv = db.conversations[conversationId];
  if (!conv) return fail(res, 404, 'Conversation not found');
  conv.pinnedAssets = (conv.pinnedAssets || []).filter((a) => a.id !== assetId);
  upsertConversation(conv);
  persist();
  return res.json(conv);
});

app.post('/api/messages', authMiddleware, async (req, res) => {
  const userId = req.userId;
  const { conversationId, content, type } = req.body || {};
  const conv = db.conversations[conversationId];
  if (!conv) return fail(res, 404, 'Conversation not found');
  const text = String(content || '').trim();
  if (!text) return fail(res, 400, 'Empty message');

  const toId = conv.isGroup ? conv.id : conv.participants.find((p) => p !== userId);
  const userMsg = {
    id: `tx-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    from: userId,
    to: toId,
    content: text,
    timestamp: nowIso(),
    status: 'signed',
    hash: generateHash(text),
    type: type || 'chat',
    cost: calculateCost(text, false)
  };
  const logs = [addMessage(userMsg)];

  // Update conversation last message
  conv.lastMessage = text;
  upsertConversation(conv);

  const created = [userMsg];

  // Auto-agent response if the other party is an agent, or group has agents
  const agentIds = conv.participants.filter((p) => db.entities[p]?.type === 'agent');
  for (const agentId of agentIds) {
    // For direct conversations, only respond with the other party (avoid multiple agents if present)
    if (!conv.isGroup) {
      const other = conv.participants.find((p) => p !== userId);
      if (other !== agentId) continue;
    }

    const replyText = await generateAgentReply({ agentId, userId, content: text });
    const agentMsg = {
      id: `tx-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      from: agentId,
      to: conv.isGroup ? conv.id : userId,
      content: replyText,
      timestamp: nowIso(),
      status: 'broadcasted',
      hash: generateHash(replyText),
      type: 'chat',
      cost: calculateCost(replyText, true)
    };
    logs.push(addMessage(agentMsg));
    created.push(agentMsg);

    // Keep group last message aligned
    conv.lastMessage = replyText.split('\n')[0].slice(0, 90);
    upsertConversation(conv);
  }

  persist();
  return res.json({ messages: created, ledgerLogs: logs, conversation: conv });
});

app.get('/api/ledger/logs', authMiddleware, (_req, res) => {
  return res.json({ logs: (db.ledgerLogs || []).slice(0, 50), stats: computeLedgerStats() });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`UBL backend listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Data file: ${DATA_PATH}`);
});
