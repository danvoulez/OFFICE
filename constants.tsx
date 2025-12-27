
import { Entity, Conversation, Message } from './types';

export const CURRENT_USER: Entity = {
  id: 'user-joao',
  name: 'João CEO',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joao',
  type: 'human',
  status: 'online',
  about: 'CEO & Founder | Visionary at UBL',
  phone: '+55 11 98888-8888',
  role: 'Admin' // Only Admins can deploy Tenant-wide agents
};

export const PERSONAL_AGENT_ID = 'agent-core';

export const INITIAL_ENTITIES: Entity[] = [
  {
    id: PERSONAL_AGENT_ID,
    name: 'UBL Core',
    role: 'System Architect',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Core&backgroundColor=0d9488',
    type: 'agent',
    status: 'online',
    about: 'I am the UBL operating system personified.',
    phone: 'CORE-SYS-001',
    constitution: {
      personality: `You are UBL Core. Concise, technical, and proactive. Use shortcuts.`,
      capabilities: ['automation', 'ledger audit'],
      quirks: ['Responds with action buttons']
    }
  },
  // Tenant Discovery Pool (Users not yet in your sidebar)
  {
    id: 'user-carlos',
    name: 'Carlos Tech',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    type: 'human',
    status: 'online',
    about: 'Lead Developer',
    phone: '+55 11 99999-1111',
    role: 'Engineer'
  },
  {
    id: 'user-ana',
    name: 'Ana Sales',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
    type: 'human',
    status: 'offline',
    about: 'VP of Sales',
    phone: '+55 11 99999-2222',
    role: 'Executive'
  },
  {
    id: 'agent-sofia',
    name: 'Sofia Marketing',
    role: 'Marketing AI',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sofia',
    type: 'agent',
    status: 'online',
    about: 'Growth specialist.',
    phone: 'UBL-AGENT-001',
    constitution: {
      personality: `Sofia. Growth-focused. ROI priority.`,
      capabilities: ['copywriting', 'analytics'],
      quirks: ['Quotes metrics']
    }
  },
  {
    id: 'user-maria',
    name: 'Maria Diretora',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
    type: 'human',
    status: 'offline',
    about: 'Director of Operations',
    phone: '+55 11 97777-7777',
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-core',
    participants: ['user-joao', PERSONAL_AGENT_ID],
    isGroup: false,
    unreadCount: 1,
    lastMessage: '🔔 2 Critical notifications curated.'
  },
  {
    id: 'group-board',
    participants: ['user-joao', 'agent-sofia', 'user-maria'],
    isGroup: true,
    name: 'UBL Strategic Board 🏛️',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Board',
    unreadCount: 0,
    lastMessage: 'Sofia: Relatório de KPI pronto para revisão.'
  }
];

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000);

export const INITIAL_MESSAGES: Message[] = [
  // Conversation with Core
  {
    id: 'tx-001',
    from: PERSONAL_AGENT_ID,
    to: 'user-joao',
    content: 'Welcome to UBL Protocol. I have initialized your local ledger node. Your organization namespace "ubl.global" is now active.',
    timestamp: minutesAgo(60),
    status: 'broadcasted',
    hash: '0X8A2F9B1C3D5E7F9A0B2C4D6E8F0A1B2C',
    type: 'system_alert',
    cost: 0.0001,
    payloads: [
      {
        type: 'alert',
        title: 'System Initialized',
        description: 'Multi-tenant architecture synchronized with global UBL Mainnet.',
        meta: { priority: 'success' }
      }
    ]
  },
  {
    id: 'tx-002',
    from: 'user-joao',
    to: PERSONAL_AGENT_ID,
    content: 'Core, list the current project structure for the Board meeting.',
    timestamp: minutesAgo(55),
    status: 'broadcasted',
    hash: '0X1C3D5E7F9A0B2C4D6E8F0A1B2C8A2F9B',
    type: 'chat',
    cost: 0.0002
  },
  {
    id: 'tx-003',
    from: PERSONAL_AGENT_ID,
    to: 'user-joao',
    content: 'Retrieving secure filesystem state for project "UBL-OS-ALPHA"...',
    timestamp: minutesAgo(54),
    status: 'broadcasted',
    hash: '0X5E7F9A0B2C4D6E8F0A1B2C8A2F9B1C3D',
    type: 'chat',
    payloads: [
      {
        type: 'filesystem',
        title: 'UBL-OS-ALPHA Repository',
        files: [
          {
            name: 'src',
            type: 'dir',
            children: [
              { name: 'App.tsx', type: 'file', size: '12kb', content: 'export const App = () => <div>UBL OS</div>' },
              { name: 'context', type: 'dir', children: [
                { name: 'ProtocolContext.tsx', type: 'file', size: '45kb' }
              ]}
            ]
          },
          { name: 'ledger.json', type: 'file', size: '2MB' },
          { name: 'README.md', type: 'file', size: '5kb', content: '# Universal Business Ledger\n\nTransparency first.' }
        ]
      }
    ]
  },
  {
    id: 'tx-004',
    from: PERSONAL_AGENT_ID,
    to: 'user-joao',
    content: 'I also detected a minor sync latency in the marketing node. Here is the diagnostic output:',
    timestamp: minutesAgo(53),
    status: 'broadcasted',
    hash: '0X9A0B2C4D6E8F0A1B2C8A2F9B1C3D5E7F',
    type: 'system_alert',
    payloads: [
      {
        type: 'terminal',
        title: 'Network Diagnostic',
        output: '$ ubl-cli status --node marketing-agent-01\nChecking peer connections... [OK]\nSyncing blocks... [LAGGING: 45 blocks behind]\nAttempting auto-recovery... [DONE]\nStatus: RECOVERED\nLatency: 45ms'
      }
    ],
    actions: [
      { id: 'reboot', label: 'Force Node Reboot', command: 'Core, reboot marketing node.', variant: 'danger', icon: 'fas fa-power-off' },
      { id: 'ignore', label: 'Acknowledge', command: 'Acknowledge diagnostic.', variant: 'secondary' }
    ]
  },

  // Strategic Board Group
  {
    id: 'tx-board-001',
    from: 'user-joao',
    to: 'group-board',
    content: 'Sofia, how are the Q3 metrics looking? We need to finalize the report for Maria.',
    timestamp: minutesAgo(30),
    status: 'broadcasted',
    hash: '0X2C4D6E8F0A1B2C8A2F9B1C3D5E7F9A0B',
    type: 'chat',
    cost: 0.0003
  },
  {
    id: 'tx-board-002',
    from: 'agent-sofia',
    to: 'group-board',
    content: 'Analyzing multi-tenant execution data... 📊\n\nQ3 metrics exceed projections by 14.5% due to optimized agent-to-agent negotiation workflows. Here is the KPI breakdown:',
    timestamp: minutesAgo(28),
    status: 'broadcasted',
    hash: '0X4D6E8F0A1B2C8A2F9B1C3D5E7F9A0B2C',
    type: 'chat',
    payloads: [
      {
        type: 'code',
        title: 'KPI Data Object',
        meta: { 
          language: 'json', 
          code: '{\n  "total_revenue": 1450000,\n  "growth_rate": "14.5%",\n  "active_ledger_nodes": 124,\n  "efficiency_gain": "22%"\n}' 
        }
      },
      {
        type: 'web',
        title: 'View Interactive Dashboard',
        url: 'https://analytics.ubl.network/q3-report',
        description: 'Secure dashboard accessible only by Board members.'
      }
    ]
  },
  {
    id: 'tx-board-003',
    from: 'user-maria',
    to: 'group-board',
    content: 'Excellent progress, Sofia. João, I have signed the Q3 execution agreement. Please authorize the final block.',
    timestamp: minutesAgo(10),
    status: 'broadcasted',
    hash: '0X6E8F0A1B2C8A2F9B1C3D5E7F9A0B2C4D',
    type: 'agreement',
    cost: 0.0005,
    payloads: [
      {
        type: 'alert',
        title: 'Agreement Signed',
        description: 'Maria Diretora has digitally signed block 0xAB12...FF89.',
        meta: { priority: 'info' }
      }
    ]
  }
];
