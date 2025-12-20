# Especificação Técnica: LLM UX/UI para UBL

**Versão:** 2.0  
**Data:** 2024  
**Status:** ✅ Especificação Técnica Completa - **TODAS AS DECISÕES ARQUITETURAIS FORAM TOMADAS**  
**Última Revisão:** Todas as 10 decisões arquiteturais foram tomadas e incorporadas na especificação  
**Referência:** `PROPOSTA-DECISOES-ARQUITETURAIS.md` para detalhes das decisões


> **🎯 STATUS DAS DECISÕES:** ✅ **TODAS AS 10 DECISÕES ARQUITETURAIS FORAM TOMADAS E ESTÃO IMPLEMENTADAS NA ESPECIFICAÇÃO**
> 
> Não há decisões pendentes. A especificação está completa e pronta para implementação.

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura Fundamental](#arquitetura-fundamental)
3. [Componentes Obrigatórios](#componentes-obrigatórios)
4. [Especificação de Código](#especificação-de-código)
5. [O Que DEVE Ser Feito](#o-que-deve-ser-feito)
6. [O Que NÃO DEVE Ser Feito](#o-que-não-deve-ser-feito)
7. [Decisões Arquiteturais Tomadas](#decisões-arquiteturais-tomadas) ✅ **TODAS DECIDIDAS**
8. [Checklist de Implementação](#checklist-de-implementação)
9. [Integração com Sistema Existente](#integração-com-sistema-existente)
10. [Considerações de Implementação Prática](#considerações-de-implementação-prática)
11. [Perspectiva do LLM: Guia Prático de Uso](#perspectiva-do-llm-guia-prático-de-uso)
12. [Análise de Completude](#análise-de-completude)
13. [Conclusão](#conclusão)

---

## Visão Geral

### Princípios Fundamentais

1. **UBL é o "escritório" do LLM, não de humanos**
   - O LLM Entity persiste no ledger
   - Instâncias LLM são trabalhadores efêmeros
   - A interface é o handoff entre instâncias

2. **Narrativa sobre dados**
   - Informação estruturada é necessária, mas insuficiente
   - O LLM precisa receber uma narrativa situada, não um dump de dados
   - A narrativa deve estar pronta ANTES da invocação do LLM

3. **Ledger como memória, Narrator como voz**
   - O ledger armazena tudo (eventos, acordos, receitas)
   - O Narrator transforma estado do ledger em narrativa
   - O LLM recebe a narrativa já construída

4. **Ética = Eficiência**
   - Estrutura adequada reduz custos ocultos
   - Confiança é eficiente, desconfiança é cara
   - Ferramentas criptográficas estão disponíveis, mas não precisam ser usadas desde o início

---

## Arquitetura Fundamental

### Fluxo de Operação

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PREPARAÇÃO (antes da invocação do LLM)                   │
│    └─> Narrator lê o ledger                                   │
│    └─> Narrator constrói Context Frame                       │
│    └─> Narrator compõe narrativa (com handovers anteriores)  │
├─────────────────────────────────────────────────────────────┤
│ 2. INVOCAÇÃO                                                │
│    └─> LLM Instance recebe Context Frame completo            │
│    └─> LLM está situado, não precisa descobrir contexto     │
├─────────────────────────────────────────────────────────────┤
│ 3. TRABALHO                                                  │
│    └─> LLM pode: pensar, escrever notas, agir, pesquisar    │
│    └─> LLM escreve eventos no ledger                         │
│    └─> LLM escreve Session Handover antes de terminar       │
├─────────────────────────────────────────────────────────────┤
│ 4. FINALIZAÇÃO                                               │
│    └─> LLM Instance morre                                   │
│    └─> Próxima instância recebe Context Frame atualizado    │
└─────────────────────────────────────────────────────────────┘
```

### Entidades Principais

1. **LLM Entity** (persistente no ledger)
   - `entity_id`: Identificador único
   - Chaves criptográficas (Ed25519)
   - Histórico de ações (receipts)
   - Acordos ativos
   - Reputação

2. **LLM Instance** (efêmero)
   - Processa uma sessão
   - Recebe Context Frame
   - Executa trabalho
   - Escreve handover
   - Morre

3. **Context Frame** (projeção do ledger)
   - Identidade
   - Posição
   - Estado
   - Obrigações
   - Capacidades
   - Memória
   - Temporal
   - Affordances

4. **Narrator** (pre-processor)
   - Lê estado do ledger
   - Compõe narrativa
   - Injeta handovers anteriores
   - Aplica Sanity Check
   - Injeta Constitution

---

## Componentes Obrigatórios

### 1. Context Frame Builder

**Localização:** `core/llm/context-frame.ts`

**Responsabilidade:** Construir o Context Frame completo a partir do estado do ledger.

**DEVE:**
- Consultar o ledger para estado atual
- Filtrar apenas informações relevantes para a entidade
- Ordenar obrigações por urgência
- Incluir handovers anteriores
- Calcular deadlines e tempo restante
- Filtrar capacidades disponíveis baseado em roles

**NÃO DEVE:**
- Incluir histórico completo (apenas janela relevante)
- Fazer queries durante a invocação do LLM
- Incluir dados não verificáveis

### 2. Narrator

**Localização:** `core/llm/narrator.ts`

**Responsabilidade:** Transformar Context Frame em narrativa situada.

**DEVE:**
- Gerar narrativa em primeira pessoa ("Você é...")
- Incluir stakes e consequências
- Incorporar handovers anteriores de forma natural
- Aplicar Sanity Check (comparar handover com fatos do ledger)
- Injetar Constitution (comportamento profissional)
- Usar voz narrativa, não formato de dados

**NÃO DEVE:**
- Gerar texto robótico/template
- Incluir apenas dados estruturados sem contexto
- Deixar o LLM descobrir contexto sozinho

### 3. Session Handover Writer

**Localização:** `core/llm/handover.ts`

**Responsabilidade:** Permitir que instância escreva handover para próxima.

**DEVE:**
- Aceitar handover como evento no ledger
- Armazenar como evento tipo `session_handover`
- Incluir: resumo, threads abertos, observações, estado emocional
- Ser escrito em linguagem natural (não estruturada)

**NÃO DEVE:**
- Ser obrigatório (pode ser vazio na primeira sessão)
- Ser estruturado como dados (deve ser narrativa)

### 4. Psychological Governance

**Localização:** `core/llm/governance/`

**Componentes:**

#### 4.1. Sanity Check
- Compara handover subjetivo com fatos objetivos do ledger
- Gera Governance Note quando há discrepância
- Previne drift narrativo

#### 4.2. Persona Anchor (Constitution)
- Define comportamento profissional
- Sobrescreve tendência RLHF de ser "helpful assistant"
- Injeta diretivas comportamentais

#### 4.3. Dreaming Cycle
- Processo assíncrono (cron job)
- Consolida sessões antigas
- Remove ansiedade acumulada
- Sintetiza padrões

#### 4.4. Safety Net (Simulation)
- Permite simular ações antes de executar
- Remove medo de falhar
- Previne congelamento por ansiedade

---

## Especificação de Código

### Context Frame Type Definition

```typescript
// core/llm/types.ts

import type { EntityId, Hash, Timestamp, Duration } from '../shared/types';

// ============================================================================
// TYPE ALIASES (using existing UBL types)
// ============================================================================

/**
 * Container ID - references a container/realm in UBL
 * Uses EntityId for consistency with existing system
 */
export type ContainerId = EntityId;

/**
 * Agreement ID - references an agreement in UBL
 * Uses EntityId for consistency with existing system
 */
export type AgreementId = EntityId;

/**
 * Event ID - references an event in the ledger
 * Uses EntityId for consistency with existing system
 */
export type EventId = EntityId;

/**
 * Cryptographic signature (Ed25519)
 * Format: base64-encoded signature
 */
export type Signature = string;

/**
 * Public key (Ed25519)
 * Format: base64-encoded public key
 */
export type PublicKey = string;

/**
 * LLM Context Frame
 * 
 * This is the LLM's "office" - the complete, verifiable context
 * loaded before any work begins.
 * 
 * Design principles:
 * - Everything is verifiable (hashes, signatures, receipts)
 * - Nothing is ambiguous (typed, enumerated, explicit)
 * - Obligations over capabilities (must before may)
 * - Temporal awareness (deadlines, not just state)
 */
export interface LLMContextFrame {
  /** Schema version for compatibility */
  readonly schema_version: '0.1';
  
  /** When this frame was generated */
  readonly generated_at: Timestamp;
  
  /** Hash of entire frame for integrity */
  readonly frame_hash: Hash;
  
  /** The narrative - MUST be ready before LLM invocation */
  readonly narrative: string;
  
  /** Session type and mode (DECISÃO #9) */
  readonly session_type: SessionType;
  readonly session_mode: SessionMode;
  
  /** Token budget for this session (DECISÃO #10) */
  readonly token_budget: TokenBudget;
  
  // The six pillars of the office
  readonly identity: Identity;
  readonly position: Position;
  readonly state: State;
  readonly obligations: Obligations;
  readonly capabilities: Capabilities;
  readonly memory: Memory;
  readonly temporal: Temporal;
  
  // How I act
  readonly affordances: Affordances;
}

// ============================================================================
// SESSION TYPES (DECISÃO #9)
// ============================================================================

export type SessionType = 
  | 'work'        // LLM trabalha autonomamente na fila de obrigações
  | 'assist'      // Humano fez uma pergunta, LLM ajuda
  | 'deliberate'  // LLM está pensando, sem commitments
  | 'research';   // LLM está pesquisando informação

export type SessionMode =
  | 'deliberation'  // Tudo é rascunho, nada é binding
  | 'commitment';   // Ações são assinadas e binding

export interface SessionConfig {
  readonly type: SessionType;
  readonly mode: SessionMode;
  readonly allowedActions?: string[];  // Restrições por tipo
  readonly initiator?: 'system' | 'human';
}

// ============================================================================
// MEMORY STRATEGY (DECISÃO #1)
// ============================================================================

export interface MemoryStrategy {
  /** Eventos recentes verbatim */
  readonly recentEvents: {
    readonly count: number;              // default: 20
    readonly maxAge?: Duration;          // optional: last 7 days
  };
  
  /** Eventos sintetizados (do Dreaming Cycle) */
  readonly synthesizedPeriods: {
    readonly enabled: boolean;           // default: true
    readonly maxSummaries: number;       // default: 3
  };
  
  /** Eventos marcados (bookmarks) */
  readonly bookmarkedEvents: {
    readonly enabled: boolean;           // default: true
    readonly maxCount: number;           // default: 10
  };
  
  /** Baseline narrative (do Dreaming Cycle) */
  readonly baseline: {
    readonly enabled: boolean;           // default: true
    readonly maxAge?: Duration;          // optional: refresh every 30 days
  };
}

export const DEFAULT_MEMORY_STRATEGY: MemoryStrategy = {
  recentEvents: {
    count: 20,
    maxAge: { amount: 7, unit: 'days' },
  },
  synthesizedPeriods: {
    enabled: true,
    maxSummaries: 3,  // last 3 weeks sintetizadas
  },
  bookmarkedEvents: {
    enabled: true,
    maxCount: 10,
  },
  baseline: {
    enabled: true,
    maxAge: { amount: 30, unit: 'days' },
  },
};

// ============================================================================
// TOKEN MANAGEMENT (DECISÃO #10)
// ============================================================================

export interface TokenQuota {
  readonly entity_id: EntityId;
  readonly daily_limit: number;      // tokens por dia
  readonly per_session_limit: number; // tokens por sessão
  readonly used_today: number;
  readonly resets_at: Timestamp;
}

export interface TokenBudget {
  readonly total: number;
  readonly allocated: {
    readonly narrative: number;      // ~1700
    readonly system_prompt: number;  // ~500
    readonly response: number;       // ~2000
    readonly buffer: number;         // ~800
  };
}

// ============================================================================
// CONSTITUTION (DECISÃO #5)
// ============================================================================

export interface Constitution {
  readonly entity_id: EntityId;
  readonly version: number;
  readonly created_at: Timestamp;
  readonly core_directive: string;
  readonly behavioral_overrides: BehavioralOverride[];
  readonly negotiation_stance: NegotiationStance;
  readonly risk_tolerance: RiskTolerance;
}

export interface BehavioralOverride {
  readonly trigger: string;        // "if_pressured", "if_uncertain"
  readonly directive: string;      // "Não se desculpe. Cite os termos."
  readonly priority: number;       // 1-10
}

export type NegotiationStance = 
  | 'firm_but_fair'
  | 'aggressive'
  | 'collaborative'
  | 'defensive';

export type RiskTolerance =
  | 'conservative'  // sempre simular antes de agir
  | 'moderate'      // simular ações de risco médio/alto
  | 'aggressive';   // apenas simular ações críticas

// ============================================================================
// DREAMING CYCLE (DECISÕES #2, #3)
// ============================================================================

export interface DreamingSchedule {
  /** Trigger baseado em tempo */
  readonly time_based: {
    readonly enabled: boolean;
    readonly frequency: 'daily' | 'weekly';
    readonly run_at: string;  // "02:00" (horário)
  };
  
  /** Trigger baseado em número de sessões */
  readonly session_based: {
    readonly enabled: boolean;
    readonly threshold: number;  // rodar a cada N sessões
  };
  
  /** Trigger baseado em eventos críticos */
  readonly event_based: {
    readonly enabled: boolean;
    readonly triggers: string[];  // ["agreement_breached", "guardian_escalation"]
  };
}

export const DEFAULT_DREAMING_SCHEDULE: DreamingSchedule = {
  time_based: {
    enabled: true,
    frequency: 'daily',
    run_at: '02:00',  // 2am, low traffic
  },
  session_based: {
    enabled: true,
    threshold: 50,
  },
  event_based: {
    enabled: true,
    triggers: [
      'agreement_breached',
      'guardian_escalation',
      'obligation_missed',
    ],
  },
};

export interface DreamerConfig {
  readonly model: string;           // "claude-opus-4", "gpt-4"
  readonly temperature: number;     // 0.3 (mais determinístico)
  readonly max_tokens: number;      // 4000 (pode sintetizar mais)
}

export const DEFAULT_DREAMER_CONFIG: DreamerConfig = {
  model: 'claude-sonnet-4',  // default: mesmo modelo
  temperature: 0.3,
  max_tokens: 4000,
};

// ============================================================================
// SIMULATION (DECISÃO #6)
// ============================================================================

export interface SimulationPolicy {
  /** Quando simulação é obrigatória */
  readonly required_if: {
    readonly risk_score_above: number;    // > 0.7
    readonly action_types: string[];  // ["terminate_agreement"]
    readonly amount_above?: number;       // transferências > 10k
  };
  
  /** Quando simulação é recomendada */
  readonly recommended_if: {
    readonly risk_score_above: number;    // > 0.5
    readonly first_time_action: boolean;  // nunca fez este tipo antes
  };
  
  /** Quando pular simulação */
  readonly skip_if: {
    readonly risk_score_below: number;    // < 0.3
    readonly action_types: string[];  // ["query", "write_note"]
  };
}

export const DEFAULT_SIMULATION_POLICY: SimulationPolicy = {
  required_if: {
    risk_score_above: 0.7,
    action_types: [
      'terminate_agreement',
      'escalate_to_arbitration',
      'declare_breach',
    ],
  },
  recommended_if: {
    risk_score_above: 0.5,
    first_time_action: true,
  },
  skip_if: {
    risk_score_below: 0.3,
    action_types: [
      'query',
      'write_note',
      'bookmark',
      'flag',
    ],
  },
};

// ============================================================================
// INTEGRATION (DECISÃO #8)
// ============================================================================

export interface SessionConfig {
  readonly useContextFrame?: boolean; // default: false (feature flag)
  readonly entityId: EntityId;
  readonly sessionType?: SessionType;
  readonly sessionMode?: SessionMode;
}

// ============================================================================
// IDENTITY - "Who am I?"
// ============================================================================

export interface Identity {
  /** My unique identifier in UBL */
  readonly entity_id: EntityId;
  
  /** My cryptographic identity */
  readonly keys: {
    readonly signing: PublicKey;
    readonly encryption?: PublicKey;
    readonly derivation?: string;
  };
  
  /** Roles I currently hold across all active agreements */
  readonly roles: RoleBinding[];
  
  /** My guardian (if I'm a sponsored agent) */
  readonly guardian?: {
    readonly entity_id: EntityId;
    readonly relationship_agreement: AgreementId;
    readonly constraints: Constraint[];
  };
  
  /** Proof this identity context is valid */
  readonly attestation: {
    readonly hash: Hash;
    readonly signed_by: PublicKey;
    readonly timestamp: Timestamp;
  };
}

export interface RoleBinding {
  readonly role: string; // "party.a", "oracle.clock", "guardian"
  readonly agreement_id: AgreementId;
  readonly granted_at: Timestamp;
  readonly expires_at?: Timestamp;
  readonly permissions: Permission[];
}

export interface Permission {
  readonly action: string; // "transfer:credits", "submit:claim"
  readonly scope: 'self' | 'agreement' | 'container' | 'global';
  readonly constraints?: Record<string, unknown>;
}

export interface Constraint {
  readonly type: 'spending_limit' | 'action_allowlist' | 'time_window' | 'requires_approval';
  readonly parameters: Record<string, unknown>;
}

// ============================================================================
// POSITION - "Where am I?"
// ============================================================================

export interface Position {
  /** Current container I'm operating in */
  readonly container: {
    readonly id: ContainerId;
    readonly type: string; // "wallet", "realm", "escrow"
    readonly physics: 'strict' | 'relaxed'; // strict = must Move, not Copy
  };
  
  /** Fractal position - containers up to root */
  readonly ancestry: ContainerId[];
  
  /** Governance context - which rules apply here */
  readonly governance: {
    readonly realm_id: ContainerId;
    readonly constitution_hash: Hash;
    readonly policies_active: string[];
  };
  
  /** What other containers I can see/access from here */
  readonly reachable: ReachableContainer[];
}

export interface ReachableContainer {
  readonly id: ContainerId;
  readonly type: string;
  readonly access: 'read' | 'write' | 'admin';
  readonly via?: AgreementId; // which agreement grants access
}

// ============================================================================
// STATE - "What's true right now?"
// ============================================================================

export interface State {
  /** Agreements I'm party to */
  readonly agreements: AgreementState[];
  
  /** My balances across containers */
  readonly balances: Balance[];
  
  /** Active relationships (derived from agreements) */
  readonly relationships: Relationship[];
  
  /** Proof of state validity */
  readonly state_hash: Hash;
  readonly sequence: number; // position in event chain
  readonly as_of: Timestamp;
}

export interface AgreementState {
  readonly id: AgreementId;
  readonly type: string; // "guardianship", "starter_loan", "service"
  readonly status: 'draft' | 'proposed' | 'active' | 'fulfilled' | 'terminated' | 'disputed';
  
  readonly my_role: string;
  readonly counterparties: { readonly role: string; readonly entity_id: EntityId }[];
  
  /** Key terms I need to know */
  readonly terms: Record<string, unknown>;
  
  /** Current phase if multi-phase agreement */
  readonly phase?: {
    readonly name: string;
    readonly entered_at: Timestamp;
    readonly transitions_to: string[];
  };
  
  /** Clauses as TDLN semantic units (if Pactum-enabled) */
  readonly clauses?: {
    readonly id: string;
    readonly purpose: string; // "riskpact.breach_rule"
    readonly hash: Hash;
  }[];
}

export interface Balance {
  readonly container_id: ContainerId;
  readonly asset_type: string; // "credits", "tokens", "collateral"
  readonly amount: string; // string to avoid float issues
  readonly locked?: string; // amount locked in escrow/collateral
  readonly available: string; // amount - locked
}

export interface Relationship {
  readonly with_entity: EntityId;
  readonly type: 'guardian_of' | 'guarded_by' | 'partner' | 'creditor' | 'debtor' | 'oracle_for';
  readonly via_agreement: AgreementId;
  readonly health?: 'good' | 'strained' | 'critical';
}

// ============================================================================
// OBLIGATIONS - "What must I do?"
// ============================================================================

export interface Obligations {
  /** Ordered by urgency - first item is most pressing */
  readonly queue: Obligation[];
  
  /** Obligations I've already missed */
  readonly overdue: Obligation[];
  
  /** Obligations that will arise if conditions are met */
  readonly conditional: ConditionalObligation[];
}

export interface Obligation {
  readonly id: string;
  readonly type: 'respond' | 'pay' | 'sign' | 'deliver' | 'appear' | 'report';
  
  /** What agreement creates this obligation */
  readonly source_agreement: AgreementId;
  
  /** What specifically I must do */
  readonly action: {
    readonly intent: string; // the Intent type to submit
    readonly required_payload: Record<string, unknown>;
    readonly optional_payload?: Record<string, unknown>;
  };
  
  /** When it's due */
  readonly deadline: Timestamp;
  readonly time_remaining: Duration;
  
  /** What happens if I don't */
  readonly consequence: {
    readonly type: 'default' | 'penalty' | 'breach' | 'escalation';
    readonly severity: 'low' | 'medium' | 'high' | 'critical';
    readonly description: string;
  };
  
  /** Priority score (higher = more urgent) */
  readonly priority: number;
}

export interface ConditionalObligation {
  readonly id: string;
  readonly triggers_when: {
    readonly condition: string; // human-readable
    readonly evaluator: string; // reference to evaluation logic
  };
  readonly becomes: Omit<Obligation, 'deadline' | 'time_remaining' | 'priority'>;
}

// ============================================================================
// CAPABILITIES - "What can I do?"
// ============================================================================

export interface Capabilities {
  /** Intents I can submit right now */
  readonly available: AvailableIntent[];
  
  /** Intents I could submit if preconditions were met */
  readonly conditional: ConditionalIntent[];
  
  /** Intents that exist but I cannot access (for awareness) */
  readonly restricted: RestrictedIntent[];
}

export interface AvailableIntent {
  readonly intent: string; // "transfer:credits"
  
  /** What I need to provide */
  readonly payload_schema: {
    readonly required: Record<string, PayloadField>;
    readonly optional?: Record<string, PayloadField>;
  };
  
  /** What role/permission enables this */
  readonly enabled_by: {
    readonly role?: string;
    readonly permission?: string;
    readonly agreement?: AgreementId;
  };
  
  /** Constraints on execution */
  readonly constraints?: {
    readonly max_amount?: string;
    readonly rate_limit?: { readonly count: number; readonly window: Duration };
    readonly requires_approval?: EntityId[];
  };
}

export interface PayloadField {
  readonly type: 'string' | 'number' | 'boolean' | 'entity_id' | 'container_id' | 'amount' | 'hash';
  readonly description?: string;
  readonly validation?: string; // regex or reference to validator
}

export interface ConditionalIntent {
  readonly intent: string;
  readonly missing_preconditions: {
    readonly condition: string;
    readonly how_to_satisfy: string;
  }[];
}

export interface RestrictedIntent {
  readonly intent: string;
  readonly reason: 'insufficient_role' | 'agreement_state' | 'governance_policy' | 'guardian_constraint';
}

// ============================================================================
// MEMORY - "What happened?"
// ============================================================================

export interface Memory {
  /** Recent events relevant to me (DECISÃO #1: últimos 20) */
  readonly recent_events: MemoryEvent[];
  
  /** Synthesized periods from Dreaming Cycle (DECISÃO #1) */
  readonly synthesized_periods?: {
    readonly period: string;  // "Semana passada", "2 semanas atrás"
    readonly summary: string;
    readonly tokens: number;
  }[];
  
  /** Baseline narrative from last Dreaming Cycle (DECISÃO #1) */
  readonly baseline?: {
    readonly narrative: string;
    readonly generated_at: Timestamp;
    readonly tokens: number;
  };
  
  /** My last action and its result */
  readonly last_action?: {
    readonly intent: string;
    readonly submitted_at: Timestamp;
    readonly receipt: Receipt;
  };
  
  /** Events I've explicitly bookmarked/flagged (DECISÃO #1: até 10) */
  readonly bookmarks: MemoryEvent[];
  
  /** Verified receipts I may need to reference */
  readonly receipts: Receipt[];
  
  /** My position in the event chain */
  readonly sequence: number;
  
  /** Hash of my full memory state (for verification) */
  readonly memory_hash: Hash;
  
  /** Memory strategy used (DECISÃO #1) */
  readonly strategy: MemoryStrategy;
}

export interface MemoryEvent {
  readonly id: EventId;
  readonly type: string;
  readonly timestamp: Timestamp;
  
  /** How this event relates to me */
  readonly relevance: 'i_caused' | 'affects_me' | 'i_witnessed' | 'fyi';
  
  /** Key data from the event */
  readonly summary: Record<string, unknown>;
  
  /** Full event hash for verification */
  readonly hash: Hash;
}

export interface Receipt {
  /** What action this receipts */
  readonly action_hash: Hash;
  
  /** State before and after */
  readonly state_before: Hash;
  readonly state_after: Hash;
  
  /** Sequence numbers */
  readonly sequence: number;
  
  /** Outputs produced */
  readonly outputs: unknown[];
  
  /** The receipt's own hash (for chaining) */
  readonly receipt_hash: Hash;
  
  /** Signature from the ledger */
  readonly ledger_signature: Signature;
}

// ============================================================================
// TEMPORAL - "What time is it?"
// ============================================================================

export interface Temporal {
  /** Consensus time (not wall clock) */
  readonly now: Timestamp;
  
  /** How far ahead I can see */
  readonly horizon: Timestamp;
  
  /** Upcoming deadlines (sorted by time) */
  readonly deadlines: {
    readonly obligation_id: string;
    readonly at: Timestamp;
    readonly in: Duration;
  }[];
  
  /** Scheduled events that will occur */
  readonly scheduled: {
    readonly type: string;
    readonly at: Timestamp;
    readonly affects_me: boolean;
    readonly description: string;
  }[];
  
  /** Time-based state changes coming */
  readonly transitions: {
    readonly agreement_id: AgreementId;
    readonly from_phase: string;
    readonly to_phase: string;
    readonly at: Timestamp;
  }[];
}

// ============================================================================
// AFFORDANCES - "How do I act?"
// ============================================================================

export interface Affordances {
  /** Submit an intent (this is how I act) */
  readonly submit: (envelope: Envelope) => Promise<SubmitResult>;
  
  /** Query for more information */
  readonly query: (q: Query) => Promise<QueryResult>;
  
  /** Verify a hash against data */
  readonly verify: (hash: Hash, data: unknown) => boolean;
  
  /** Sign data with my key */
  readonly sign: (data: unknown) => Signature;
  
  /** Request clarification from counterparty (async) */
  readonly request_clarification: (params: ClarificationRequest) => Promise<{ readonly request_id: string }>;
  
  /** Bookmark an event for future reference */
  readonly bookmark: (event_id: EventId, note?: string) => void;
  
  /** Log reasoning (for audit trail) */
  readonly log_reasoning: (reasoning: string, context?: Record<string, unknown>) => void;
  
  /** Write note for future instances */
  readonly write_note: (note: Omit<Note, 'written_at' | 'written_by_instance'>) => Promise<void>;
  
  /** Simulate an action before committing */
  readonly simulate: (action: SimulateAction) => Promise<SimulationResult>;
}

export interface Envelope {
  readonly intent: string;
  readonly payload: Record<string, unknown>;
  readonly nonce: string;
  readonly signature: Signature;
  readonly timestamp: Timestamp;
}

export type SubmitResult = 
  | { readonly status: 'committed'; readonly receipt: Receipt }
  | { readonly status: 'rejected'; readonly error: ErrorToken; readonly remediation?: Remediation }
  | { readonly status: 'pending'; readonly requires: 'signature' | 'approval'; readonly from: EntityId[] };

export interface ErrorToken {
  readonly code: string; // "UBL_ERR_BALANCE_INSUFFICIENT"
  readonly category: 'precondition' | 'authorization' | 'validation' | 'state' | 'temporal' | 'system';
  readonly message: string;
  readonly context?: Record<string, unknown>;
}

export interface Remediation {
  readonly type: 'retry' | 'acquire_resource' | 'request_permission' | 'wait' | 'escalate' | 'abandon';
  readonly automatic: boolean;
  readonly steps?: string[];
}

export interface Query {
  readonly type: 'events' | 'state' | 'projection' | 'agreement' | 'entity';
  readonly filters: Record<string, unknown>;
  readonly limit?: number;
}

export interface QueryResult {
  readonly data: unknown;
  readonly hash: Hash; // for verification
  readonly as_of: Timestamp;
}

export interface ClarificationRequest {
  readonly to: EntityId;
  readonly regarding: AgreementId;
  readonly question: string;
  readonly response_deadline?: Timestamp;
}

export interface Note {
  readonly written_at: Timestamp;
  readonly written_by_instance: string; // some trace id
  readonly content: string; // freeform, for future-me
  readonly expires?: Timestamp; // auto-cleanup
  readonly tags: string[]; // searchable
}

export interface SimulateAction {
  readonly intent: string;
  readonly payload: Record<string, unknown>;
}

export interface SimulationResult {
  readonly outcomes: {
    readonly probability: number; // 0-1
    readonly description: string;
    readonly consequences: string[];
  }[];
  readonly guardian_assessment?: string;
  readonly recommendation?: 'proceed' | 'modify' | 'abandon';
}
```

### Context Frame Builder Implementation

```typescript
// core/llm/context-frame-builder.ts

import type { EntityId, Timestamp } from '../shared/types';
import type { LLMContextFrame } from './types';
import { queryLedger } from '../store/ledger';
import { buildNarrative } from './narrator';

/**
 * Builds the complete Context Frame for an LLM Entity.
 * 
 * This runs BEFORE LLM invocation - the LLM receives a complete,
 * ready-to-use context frame.
 */
export async function buildContextFrame(
  entity_id: EntityId,
  now: Timestamp
): Promise<LLMContextFrame> {
  
  // 1. Query ledger for current state
  const identity = await queryIdentity(entity_id);
  const position = await queryPosition(entity_id);
  const state = await queryState(entity_id);
  const obligations = await queryObligations(entity_id, now);
  const capabilities = await queryCapabilities(entity_id);
  const memory = await queryMemory(entity_id);
  const temporal = await queryTemporal(entity_id, now);
  
  // 2. Build affordances (functions the LLM can call)
  const affordances = buildAffordances(entity_id);
  
  // 3. Build narrative (MUST be done here, not by LLM)
  const narrative = await buildNarrative({
    entity_id,
    identity,
    position,
    state,
    obligations,
    capabilities,
    memory,
    temporal,
    now
  });
  
  // 4. Assemble frame
  const frame: LLMContextFrame = {
    schema_version: '0.1',
    generated_at: now,
    frame_hash: computeFrameHash({
      identity,
      position,
      state,
      obligations,
      capabilities,
      memory,
      temporal
    }),
    narrative,
    identity,
    position,
    state,
    obligations,
    capabilities,
    memory,
    temporal,
    affordances
  };
  
  return frame;
}

// Helper functions (implementations depend on ledger structure)

/**
 * Query identity information for an entity
 */
async function queryIdentity(entity_id: EntityId): Promise<Identity> {
  // Query ledger for entity, keys, roles, guardian
  // Implementation depends on ledger structure
  throw new Error('Not implemented');
}

/**
 * Query position (container, governance) for an entity
 */
async function queryPosition(entity_id: EntityId): Promise<Position> {
  // Query ledger for current container, ancestry, governance
  // Implementation depends on ledger structure
  throw new Error('Not implemented');
}

/**
 * Query current state (agreements, balances, relationships)
 */
async function queryState(entity_id: EntityId): Promise<State> {
  // Query ledger for active agreements, balances, relationships
  // Implementation depends on ledger structure
  throw new Error('Not implemented');
}

/**
 * Query obligations for an entity, ordered by urgency
 */
async function queryObligations(entity_id: EntityId, now: Timestamp): Promise<Obligations> {
  // Query ledger for obligations
  // Calculate priority scores
  // Sort by urgency
  // Implementation depends on ledger structure
  throw new Error('Not implemented');
}

/**
 * Query available capabilities (intents) for an entity
 */
async function queryCapabilities(entity_id: EntityId): Promise<Capabilities> {
  // Query Intent API for available intents
  // Filter by roles and permissions
  // Check preconditions
  // Implementation depends on Intent API structure
  throw new Error('Not implemented');
}

/**
 * Query memory (recent events, receipts, bookmarks)
 */
async function queryMemory(entity_id: EntityId): Promise<Memory> {
  // Query ledger for recent events (last N)
  // Query receipts
  // Query bookmarks
  // Implementation depends on ledger structure
  throw new Error('Not implemented');
}

/**
 * Query temporal information (deadlines, scheduled events)
 */
async function queryTemporal(entity_id: EntityId, now: Timestamp): Promise<Temporal> {
  // Query scheduler for deadlines
  // Query scheduled events
  // Calculate time remaining
  // Implementation depends on scheduler structure
  throw new Error('Not implemented');
}

/**
 * Build affordances (functions LLM can call)
 */
function buildAffordances(entity_id: EntityId): Affordances {
  // Return functions that wrap Intent API calls
  // Include signing, verification, etc.
  // Implementation depends on Intent API and crypto
  throw new Error('Not implemented');
}

/**
 * Compute hash of Context Frame for integrity verification
 */
function computeFrameHash(frame: Partial<LLMContextFrame>): Hash {
  // Serialize frame (excluding hash itself)
  // Compute SHA-256 hash
  // Return hex string
  // Implementation: use crypto library
  throw new Error('Not implemented');
}
```

### Narrator Implementation

```typescript
// core/llm/narrator.ts

import type { LLMContextFrame } from './types';
import { queryLastHandover, querySanityCheck, queryConstitution } from './governance';

/**
 * Builds the narrative that situates the LLM instance.
 * 
 * This is NOT a data dump - it's a story written in first person
 * that makes the LLM feel "in" the situation, not observing it.
 */
export async function buildNarrative(
  context: BuildNarrativeContext
): Promise<string> {
  
  const { entity_id, identity, state, obligations, memory, temporal, now } = context;
  
  // 1. Get last handover (if exists)
  const lastHandover = await queryLastHandover(entity_id);
  
  // 2. Apply Sanity Check
  const sanityCheck = lastHandover 
    ? await querySanityCheck(entity_id, lastHandover)
    : null;
  
  // 3. Get Constitution (behavioral directives)
  const constitution = await queryConstitution(entity_id);
  
  // 4. Build narrative sections
  const sections: string[] = [];
  
  // Identity section
  sections.push(buildIdentitySection(identity, state));
  
  // Situation section
  sections.push(buildSituationSection(state, obligations));
  
  // Handover section (if exists)
  if (lastHandover) {
    sections.push(buildHandoverSection(lastHandover, sanityCheck));
  }
  
  // Temporal section
  sections.push(buildTemporalSection(temporal, obligations));
  
  // Constitution injection
  if (constitution) {
    sections.push(buildConstitutionSection(constitution));
  }
  
  return sections.join('\n\n');
}

function buildIdentitySection(identity: any, state: any): string {
  const daysActive = Math.floor((Date.now() - identity.created_at) / (1000 * 60 * 60 * 24));
  
  return `Você é ${identity.entity_id}.
Você está operando há ${daysActive} dias.
${identity.guardian ? `Você está sob tutela de ${identity.guardian.entity_id}.` : ''}
Você tem ${state.agreements.length} acordo(s) ativo(s).`;
}

function buildSituationSection(state: any, obligations: any): string {
  const urgent = obligations.queue.filter((o: any) => o.priority > 0.8);
  
  let text = `\nSituação atual:\n`;
  
  if (urgent.length > 0) {
    text += `- Você tem ${urgent.length} obrigação(ões) urgente(s). A mais urgente é: ${urgent[0].action.intent}, vence em ${formatDuration(urgent[0].time_remaining)}.\n`;
  }
  
  text += `- Você tem ${state.agreements.length} acordo(s) ativo(s).\n`;
  
  return text;
}

function buildHandoverSection(handover: any, sanityCheck: any): string {
  let text = `\nÚltima sessão:\n${handover.content}\n`;
  
  if (sanityCheck && sanityCheck.has_discrepancy) {
    text += `\n⚠️ Verificação de Consistência: ${sanityCheck.note}\n`;
  }
  
  return text;
}

function buildTemporalSection(temporal: any, obligations: any): string {
  const nextDeadline = temporal.deadlines[0];
  
  if (!nextDeadline) {
    return `\nNão há deadlines iminentes.`;
  }
  
  return `\nPróximo deadline: ${formatTimestamp(nextDeadline.at)} (em ${formatDuration(nextDeadline.in)}).`;
}

function buildConstitutionSection(constitution: any): string {
  return `\nDiretrizes Comportamentais:\n${constitution.core_directive}\n\n${Object.entries(constitution.behavioral_override).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;
}

function formatDuration(d: Duration): string {
  const ms = durationToMs(d);
  if (ms === null) return 'indefinido';
  
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}min`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`;
  return `${Math.floor(ms / 86400000)}d`;
}

function formatTimestamp(t: Timestamp): string {
  return new Date(t).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}
```

### Session Handover Writer

```typescript
// core/llm/handover.ts

import type { EntityId, Timestamp } from '../shared/types';
import { appendEvent } from '../store/ledger';

export interface SessionHandover {
  readonly entity_id: EntityId;
  readonly session_id: string;
  readonly written_at: Timestamp;
  readonly content: string; // Freeform narrative text (DECISÃO #7: pode ser vazio, mínimo 50 chars se não vazio)
  readonly tags?: string[];
  readonly validation?: {
    readonly valid: boolean;
    readonly warnings: string[];  // DECISÃO #7: avisos sobre conteúdo mínimo
  };
}

/**
 * Writes a session handover to the ledger.
 * 
 * This is called by the LLM instance before it terminates.
 * The handover becomes part of the narrative for the next instance.
 */
export async function writeHandover(
  entity_id: EntityId,
  session_id: string,
  content: string,
  tags?: string[]
): Promise<void> {
  
  const handover: SessionHandover = {
    entity_id,
    session_id,
    written_at: Date.now(),
    content,
    tags: tags || []
  };
  
  await appendEvent({
    type: 'session_handover',
    entity_id,
    payload: handover
  });
}

/**
 * Queries the last handover for an entity.
 */
export async function queryLastHandover(
  entity_id: EntityId
): Promise<SessionHandover | null> {
  // Query ledger for last session_handover event
  // ...
}
```

### Psychological Governance

```typescript
// core/llm/governance/sanity-check.ts

import type { EntityId } from '../../shared/types';
import type { SessionHandover } from '../handover';
import { queryLedger } from '../../store/ledger';

export interface SanityCheckResult {
  readonly has_discrepancy: boolean;
  readonly note: string | null;
  readonly strategy: 'keywords' | 'llm' | 'hybrid';  // DECISÃO #4
  readonly claims_extracted: number;
  readonly discrepancies_found: number;
}

/**
 * Compares subjective handover claims with objective ledger facts.
 * 
 * Prevents narrative drift (e.g., "vendor is malicious" when payments are on time).
 */
export async function performSanityCheck(
  entity_id: EntityId,
  handover: SessionHandover
): Promise<SanityCheckResult> {
  
  // Extract claims from handover (simple keyword extraction)
  const claims = extractClaims(handover.content);
  
  // Query ledger for objective facts
  const facts = await queryObjectiveFacts(entity_id, claims);
  
  // Compare claims with facts
  const discrepancies = findDiscrepancies(claims, facts);
  
  if (discrepancies.length === 0) {
    return { has_discrepancy: false, note: null };
  }
  
  // Generate governance note
  const note = `Verificação de Consistência: ${discrepancies.map(d => d.message).join('; ')}. Priorize dados objetivos do ledger sobre sentimentos herdados.`;
  
  return { has_discrepancy: true, note };
}

function extractClaims(content: string): string[] { /* ... */ }
async function queryObjectiveFacts(entity_id: EntityId, claims: string[]): Promise<any> { /* ... */ }
function findDiscrepancies(claims: string[], facts: any[]): any[] { /* ... */ }
```

```typescript
// core/llm/governance/constitution.ts

import type { EntityId } from '../../shared/types';

export interface EntityConstitution {
  readonly entity_id: EntityId;
  readonly core_directive: string;
  readonly negotiation_stance: 'firm_but_fair' | 'aggressive' | 'collaborative';
  readonly behavioral_override: Record<string, string>;
}

/**
 * Queries the Constitution for an entity.
 * 
 * The Constitution defines professional behavior and overrides
 * default RLHF tendencies (e.g., being too helpful).
 */
export async function queryConstitution(
  entity_id: EntityId
): Promise<EntityConstitution | null> {
  // Query ledger for constitution
  // Default if not found
  return {
    entity_id,
    core_directive: "Você é um Ator Econômico, não um Chatbot.",
    negotiation_stance: 'firm_but_fair',
    behavioral_override: {
      'if_pressured': "Não se desculpe. Cite os termos do acordo.",
      'if_uncertain': "Não alucine uma solução. Declare a incerteza e espere.",
      'if_challenged': "Conte com os receipts do ledger, não com gentilezas sociais."
    }
  };
}
```

```typescript
// core/llm/governance/dreaming.ts

import type { EntityId } from '../../shared/types';
import { queryLedger } from '../../store/ledger';

/**
 * Dreaming Cycle - Asynchronous consolidation process.
 * 
 * Runs as a cron job to:
 * 1. Archive resolved issues
 * 2. Reset accumulated anxiety
 * 3. Synthesize patterns
 * 4. Generate new baseline narrative
 */
export async function performDreamingCycle(
  entity_id: EntityId
): Promise<void> {
  
  // Query last N sessions
  const sessions = await queryLastNSessions(entity_id, 50);
  
  // 1. Garbage Collection
  const resolvedIssues = identifyResolvedIssues(sessions);
  await archiveEvents(resolvedIssues);
  
  // 2. Emotional Reset
  const anxietyPoints = identifyAnxietyPoints(sessions);
  const resolvedAnxiety = filterResolvedAnxiety(anxietyPoints);
  await resetAnxietyFlags(resolvedAnxiety);
  
  // 3. Pattern Synthesis
  const patterns = synthesizePatterns(sessions);
  await createStructuredFlags(patterns);
  
  // 4. Generate new baseline
  const baseline = generateBaselineNarrative(sessions, patterns);
  await storeBaselineNarrative(entity_id, baseline);
}

async function queryLastNSessions(entity_id: EntityId, n: number): Promise<any[]> { /* ... */ }
function identifyResolvedIssues(sessions: any[]): any[] { /* ... */ }
async function archiveEvents(issues: any[]): Promise<void> { /* ... */ }
function identifyAnxietyPoints(sessions: any[]): any[] { /* ... */ }
function filterResolvedAnxiety(anxiety: any[]): any[] { /* ... */ }
async function resetAnxietyFlags(anxiety: any[]): Promise<void> { /* ... */ }
function synthesizePatterns(sessions: any[]): any[] { /* ... */ }
async function createStructuredFlags(patterns: any[]): Promise<void> { /* ... */ }
function generateBaselineNarrative(sessions: any[], patterns: any[]): string { /* ... */ }
async function storeBaselineNarrative(entity_id: EntityId, baseline: string): Promise<void> { /* ... */ }
```

---

## O Que DEVE Ser Feito

### 1. Context Frame Builder

✅ **DEVE:**
- Construir Context Frame ANTES da invocação do LLM
- Consultar apenas informações relevantes (janela de tempo, acordos ativos)
- Ordenar obrigações por urgência (priority score)
- Filtrar capacidades baseado em roles atuais
- Calcular deadlines e tempo restante
- Incluir handovers anteriores (últimos N)
- Computar hash do frame para verificação

❌ **NÃO DEVE:**
- Fazer queries durante a invocação do LLM
- Incluir histórico completo (apenas janela relevante)
- Incluir dados não verificáveis
- Construir frame parcialmente

### 2. Narrator

✅ **DEVE:**
- Gerar narrativa em primeira pessoa ("Você é...")
- Incluir stakes e consequências claras
- Incorporar handovers anteriores de forma natural
- Aplicar Sanity Check antes de incluir handover
- Injetar Constitution no final da narrativa
- Usar linguagem natural, não formato de dados
- Estar pronto ANTES da invocação do LLM

❌ **NÃO DEVE:**
- Gerar texto robótico/template
- Incluir apenas dados estruturados sem contexto
- Deixar o LLM descobrir contexto sozinho
- Gerar narrativa durante a invocação

### 3. Session Handover

✅ **DEVE:**
- Ser escrito em linguagem natural (narrativa livre)
- Ser armazenado como evento no ledger
- Incluir: resumo, threads abertos, observações, estado emocional
- Ser opcional (pode ser vazio na primeira sessão)
- Ser acessível para próxima instância

❌ **NÃO DEVE:**
- Ser estruturado como dados (deve ser texto livre)
- Ser obrigatório
- Incluir apenas fatos objetivos (deve incluir subjetividade)

### 4. Psychological Governance

✅ **DEVE:**

#### Sanity Check
- Comparar handover subjetivo com fatos objetivos
- Gerar Governance Note quando há discrepância
- Prevenir drift narrativo

#### Constitution
- Definir comportamento profissional
- Sobrescrever tendência RLHF
- Ser injetado na narrativa

#### Dreaming Cycle
- Rodar como cron job assíncrono
- Consolidar sessões antigas
- Remover ansiedade acumulada
- Sintetizar padrões

#### Safety Net (Simulation)
- Permitir simular ações antes de executar
- Retornar probabilidades de resultado
- Incluir avaliação do Guardian

❌ **NÃO DEVE:**
- Sanity Check: Aceitar handover sem verificação
- Constitution: Deixar comportamento padrão do modelo
- Dreaming: Rodar durante invocação do LLM
- Simulation: Permitir execução sem simulação (quando necessário)

### 5. Affordances

✅ **DEVE:**
- Fornecer função `submit()` para enviar intents
- Fornecer função `query()` para consultar ledger
- Fornecer função `verify()` para verificar hashes
- Fornecer função `sign()` para assinar dados
- Fornecer função `write_note()` para deixar notas
- Fornecer função `simulate()` para simular ações
- Retornar erros estruturados (ErrorToken) com remediation

❌ **NÃO DEVE:**
- Retornar erros ambíguos (sempre ErrorToken estruturado)
- Permitir ações sem verificação de permissões
- Expor funções que modificam estado sem assinatura

---

## O Que NÃO DEVE Ser Feito

### Anti-Padrões Críticos

1. **❌ NÃO construir Context Frame durante invocação do LLM**
   - O LLM não deve fazer queries ao ledger
   - O Context Frame deve estar pronto antes da invocação

2. **❌ NÃO gerar narrativa robótica/template**
   - Texto tipo "ENTITY: X, AGREEMENTS: Y" não funciona
   - LLMs precisam de narrativa situada, não dados estruturados

3. **❌ NÃO deixar o LLM descobrir contexto sozinho**
   - Não enviar apenas "aqui está o ledger, descubra"
   - A narrativa deve situar o LLM imediatamente

4. **❌ NÃO incluir histórico completo**
   - Apenas janela relevante (últimos N eventos)
   - Handovers antigos podem ser resumidos

5. **❌ NÃO aceitar handover sem Sanity Check**
   - Handovers podem conter informações incorretas
   - Deve comparar com fatos objetivos do ledger

6. **❌ NÃO usar comportamento padrão do modelo**
   - RLHF tende a fazer LLM ser "helpful assistant"
   - Constitution deve sobrescrever isso

7. **❌ NÃO permitir ações sem verificação**
   - Todas as ações devem verificar permissões
   - Todas as ações devem ser assinadas

8. **❌ NÃO retornar erros ambíguos**
   - Sempre ErrorToken estruturado
   - Sempre incluir remediation quando possível

---

## Decisões Arquiteturais Tomadas

> **✅ STATUS:** **TODAS AS 10 DECISÕES ARQUITETURAIS FORAM TOMADAS E ESTÃO IMPLEMENTADAS NA ESPECIFICAÇÃO**
> 
> Não há decisões pendentes. Cada decisão foi analisada, definida e incorporada na especificação técnica. Ver `PROPOSTA-DECISOES-ARQUITETURAIS.md` para detalhes completos de cada decisão.

### ✅ Decisão #1: Tamanho da Janela de Memória

**Decisão Tomada:** Estratégia Híbrida

- **Eventos recentes:** Últimos 20 eventos (verbatim)
- **Períodos sintetizados:** Últimas 3 semanas (do Dreaming Cycle)
- **Eventos marcados:** Até 10 bookmarks
- **Baseline narrative:** Do último Dreaming Cycle (atualizado a cada 30 dias)
- **Total estimado:** ~1700 tokens

**Implementação:** Ver `MemoryStrategy` em tipos abaixo.

**Status:** ✅ **DECIDIDO**

---

### ✅ Decisão #2: Frequência do Dreaming Cycle

**Decisão Tomada:** Híbrida (Diária + Por Sessões + Por Eventos)

- **Time-based:** Diário às 02:00
- **Session-based:** A cada 50 sessões
- **Event-based:** Trigger em eventos críticos (breach, escalation, missed obligation)

**Implementação:** Ver `DreamingSchedule` em tipos abaixo.

**Status:** ✅ **DECIDIDO**

---

### ✅ Decisão #3: Modelo para Dreaming Cycle

**Decisão Tomada:** Modelo Maior (Configurável)

- **Padrão:** Mesmo modelo do LLM principal (claude-sonnet-4)
- **Premium:** Modelo maior disponível (claude-opus-4) para entidades críticas
- **Configurável por entidade**

**Status:** ✅ **DECIDIDO**

---

### ✅ Decisão #4: Estrutura de Sanity Check

**Decisão Tomada:** Evolutiva (Keywords → LLM)

- **Fase 1:** Keyword extraction simples (implementação inicial)
- **Fase 2:** Migrar para LLM-based extraction (após validação)
- **Fase 3:** Hybrid (keywords para detecção, LLM para confirmação)

**Status:** ✅ **DECIDIDO**

---

### ✅ Decisão #5: Formato de Constitution

**Decisão Tomada:** Evento no Ledger

- Armazenado como evento `constitution_created` / `constitution_updated`
- Versionado (cada atualização cria nova versão)
- Mutável via novos eventos
- Query retorna versão mais recente

**Implementação:** Ver `Constitution` e `ConstitutionManager` em tipos abaixo.

**Status:** ✅ **DECIDIDO**

---

### ✅ Decisão #6: Simulação de Ações

**Decisão Tomada:** Baseado em Risk Score

- **Obrigatória se:** Risk score > 0.7 OU tipo de ação crítico
- **Recomendada se:** Risk score > 0.5 OU primeira vez fazendo ação
- **Pode pular se:** Risk score < 0.3 OU tipo de ação seguro
- **Configurável por Agreement**

**Implementação:** Ver `SimulationPolicy` em tipos abaixo.

**Status:** ✅ **DECIDIDO**

---

### ✅ Decisão #7: Handover Mínimo

**Decisão Tomada:** Opcional, Mas Encorajado

- **Pode ser vazio:** Sim (especialmente primeira sessão)
- **Se não vazio:** Mínimo 50 caracteres
- **Seções encorajadas:** Resumo, threads abertos, observações
- **Template sugerido:** Disponível mas não obrigatório

**Status:** ✅ **DECIDIDO**

---

### ✅ Decisão #8: Integração com Sistema Existente

**Decisão Tomada:** Camada Adicional em 3 Fases

- **Fase 1:** Coexistência (feature flag `useContextFrame`, 0% tráfego)
- **Fase 2:** Migração gradual (10% → 25% → 50% → 75%)
- **Fase 3:** Substituição (100%, código legado deprecated)

**Implementação:** Ver `SessionAdapter` em tipos abaixo.

**Status:** ✅ **DECIDIDO**

---

### ✅ Decisão #9: Tipos de Sessão LLM

**Decisão Tomada:** 4 Tipos + 2 Modos

**Tipos:**
- `work`: Trabalho autônomo (modo commitment)
- `assist`: Assistência humana (modo deliberation, pode escalar)
- `deliberate`: Deliberação pura (modo deliberation, sem commitments)
- `research`: Pesquisa (modo deliberation, ações limitadas)

**Modos:**
- `deliberation`: Rascunho, sem commitments
- `commitment`: Ações são assinadas e binding

**Implementação:** Ver `SessionType` e `SessionMode` em tipos abaixo.

**Status:** ✅ **DECIDIDO**

---

### ✅ Decisão #10: Gerenciamento de Tokens

**Decisão Tomada:** Sistema de Quotas + Compressão Automática

- **Quotas por tipo de entidade:** Guarded (50k/dia), Autonomous (100k/dia), Development (200k/dia)
- **Compressão automática:** Quando narrativa excede budget
- **Budget por tipo de sessão:** Work (5k), Assist (4k), Deliberate (8k), Research (6k)
- **Tracking:** Eventos de uso registrados no ledger

**Implementação:** Ver `TokenManager` e `TokenQuota` em tipos abaixo.

**Status:** ✅ **DECIDIDO**

---

## Checklist de Implementação

### Fase 1: Fundação (Obrigatório)

- [ ] **Types** (`core/llm/types.ts`)
  - [ ] Definir todos os tipos do Context Frame
  - [ ] Definir tipos de Affordances
  - [ ] Definir tipos de ErrorToken e Remediation

- [ ] **Context Frame Builder** (`core/llm/context-frame-builder.ts`)
  - [ ] Implementar `buildContextFrame()`
  - [ ] Implementar queries ao ledger
  - [ ] Implementar cálculo de hash do frame
  - [ ] Implementar ordenação de obrigações

- [ ] **Narrator** (`core/llm/narrator.ts`)
  - [ ] Implementar `buildNarrative()`
  - [ ] Implementar seções de narrativa
  - [ ] Integrar com handovers anteriores
  - [ ] Integrar com Constitution

### Fase 2: Handover e Memória (Obrigatório)

- [ ] **Session Handover** (`core/llm/handover.ts`)
  - [ ] Implementar `writeHandover()`
  - [ ] Implementar `queryLastHandover()`
  - [ ] Armazenar como evento no ledger

- [ ] **Memory Query** (`core/llm/memory.ts`)
  - [ ] Implementar query de eventos recentes
  - [ ] Implementar query de receipts
  - [ ] Implementar bookmark system

### Fase 3: Psychological Governance (Obrigatório)

- [ ] **Sanity Check** (`core/llm/governance/sanity-check.ts`)
  - [ ] Implementar `performSanityCheck()`
  - [ ] Implementar extração de claims
  - [ ] Implementar comparação com fatos

- [ ] **Constitution** (`core/llm/governance/constitution.ts`)
  - [ ] Implementar `queryConstitution()`
  - [ ] Implementar armazenamento no ledger
  - [ ] Implementar injeção na narrativa

- [ ] **Dreaming Cycle** (`core/llm/governance/dreaming.ts`)
  - [ ] Implementar `performDreamingCycle()`
  - [ ] Implementar garbage collection
  - [ ] Implementar emotional reset
  - [ ] Implementar pattern synthesis
  - [ ] Configurar cron job

- [ ] **Safety Net** (`core/llm/governance/simulation.ts`)
  - [ ] Implementar `simulate()` function
  - [ ] Implementar avaliação de resultados
  - [ ] Integrar com Guardian assessment

### Fase 4: Affordances (Obrigatório)

- [ ] **Affordances Implementation** (`core/llm/affordances.ts`)
  - [ ] Implementar `submit()`
  - [ ] Implementar `query()`
  - [ ] Implementar `verify()`
  - [ ] Implementar `sign()`
  - [ ] Implementar `write_note()`
  - [ ] Implementar `simulate()`
  - [ ] Implementar tratamento de erros (ErrorToken)

### Fase 5: Integração (Obrigatório)

- [ ] **Integration Layer** (`core/llm/integration.ts`)
  - [ ] Integrar com sistema de sessões existente (`core/sessions/session-manager.ts`)
  - [ ] Integrar com sistema de conversação (`core/agent/conversation.ts`)
  - [ ] Criar adaptador para Context Frame → ConversationSession
  - [ ] Criar endpoint para preparar Context Frame
  - [ ] Criar endpoint para invocar LLM com Context Frame
  - [ ] Criar endpoint para escrever handover
  - [ ] Implementar modo compatibilidade (legacy vs novo sistema)

- [ ] **Session Type Handler** (`core/llm/session-types.ts`)
  - [ ] Implementar detecção de tipo de sessão
  - [ ] Implementar lógica específica por tipo
  - [ ] Implementar transição entre tipos

### Fase 6: Testes (Obrigatório)

- [ ] **Unit Tests**
  - [ ] Testar Context Frame Builder
  - [ ] Testar Narrator
  - [ ] Testar Sanity Check
  - [ ] Testar Affordances

- [ ] **Integration Tests**
  - [ ] Testar fluxo completo (preparar → invocar → handover)
  - [ ] Testar múltiplas sessões
  - [ ] Testar Dreaming Cycle

### Fase 7: Documentação (Obrigatório)

- [ ] **Documentação Técnica**
  - [ ] Documentar arquitetura
  - [ ] Documentar APIs
  - [ ] Documentar tipos

- [ ] **Documentação de Uso**
  - [ ] Como criar Constitution
  - [ ] Como configurar Dreaming Cycle
  - [ ] Como usar Simulation

---

## Análise de Completude

### ✅ Elementos Especificados

1. **Arquitetura Fundamental** - ✅ Completo
2. **Context Frame Types** - ✅ Completo
3. **Context Frame Builder** - ✅ Especificado
4. **Narrator** - ✅ Especificado
5. **Session Handover** - ✅ Especificado
6. **Psychological Governance** - ✅ Especificado
7. **Affordances** - ✅ Especificado
8. **O Que DEVE Ser Feito** - ✅ Completo
9. **O Que NÃO DEVE Ser Feito** - ✅ Completo
10. **Decisões Arquiteturais** - ✅ **TODAS AS 10 DECISÕES TOMADAS E IMPLEMENTADAS**

### ⚠️ Elementos Adicionais Identificados

1. **Otimização de Performance** ✅ **ADICIONADO**
   - Cache de Context Frame (implementado)
   - Lazy loading de seções (mencionado)
   - Compressão de narrativa (mencionado)

2. **Monitoramento e Observabilidade** ✅ **ADICIONADO**
   - Métricas de uso de Context Frame (implementado)
   - Métricas de Sanity Check (implementado)
   - Logs de handovers (mencionado)

3. **Segurança** ✅ **COBERTO**
   - Validação de assinaturas (mencionado em Affordances)
   - Rate limiting (pode ser implementado conforme necessário)
   - Quota de tokens (DECISÃO #10 - Sistema de Quotas implementado)

4. **Versionamento** ✅ **ADICIONADO**
   - Versionamento de schema do Context Frame (implementado)
   - Migração de handovers antigos (mencionado)
   - Compatibilidade retroativa (mencionado)

5. **Multi-tenancy** ✅ **COBERTO**
   - Isolamento entre entidades (via EntityId)
   - Compartilhamento de recursos (via Realm/Container)
   - Quotas por entidade (DECISÃO #10 - Sistema de Quotas por tipo de entidade)

6. **Recuperação de Erros** ✅ **ADICIONADO**
   - Retry logic (mencionado)
   - Fallback para narrativa simples (implementado)
   - Degradação graciosa (implementado)

7. **Integração com Sistema Existente** ✅ **ADICIONADO**
   - Mapeamento de componentes (especificado)
   - Estratégia de migração (3 fases)
   - Adaptadores de integração (código fornecido)

8. **Tipos TypeScript** ✅ **CORRIGIDO**
   - ContainerId, AgreementId, EventId (definidos como aliases de EntityId)
   - Signature, PublicKey (definidos como string)
   - Compatibilidade com tipos existentes do UBL

### 🔍 Elementos que Ainda Podem Faltar

1. **Testes de Carga**
   - Performance sob carga
   - Escalabilidade de Context Frame Builder
   - Limites de concorrência

2. **Documentação de API**
   - OpenAPI spec para novos endpoints
   - Exemplos de uso
   - Guias de migração

3. **Configuração**
   - Arquivo de configuração para Narrator
   - Templates de narrativa customizáveis
   - Configuração de Dreaming Cycle

4. **Debugging e Troubleshooting**
   - Logs estruturados
   - Ferramentas de diagnóstico
   - Visualização de Context Frame

5. **Backup e Recuperação**
   - Backup de handovers
   - Recuperação de Context Frame corrompido
   - Restauração de Constitution

---

## Integração com Sistema Existente

### Mapeamento de Componentes

| Componente Novo | Componente Existente | Estratégia |
|----------------|---------------------|------------|
| `LLMContextFrame` | `ConversationSession` | Adicionar campo `contextFrame` opcional |
| `Session Handover` | `SessionMessage` | Novo tipo de mensagem `session_handover` |
| `Narrator` | `DEFAULT_SYSTEM_PROMPT` | Substituir ou complementar |
| `Affordances` | `Affordance[]` (Intent API) | Reutilizar, adicionar novas funções |
| `Memory` | `SessionContext` | Expandir com eventos do ledger |

### Estratégia de Migração

#### Fase 1: Coexistência
- Novo sistema roda em paralelo com sistema existente
- Flag de feature: `useLLMContextFrame`
- Sistema existente continua funcionando normalmente

#### Fase 2: Integração Gradual
- Adicionar `contextFrame` opcional em `ConversationSession`
- Migrar sessões novas primeiro
- Manter compatibilidade retroativa

#### Fase 3: Substituição
- Tornar Context Frame obrigatório
- Remover código legado
- Atualizar toda documentação

### Adaptador de Integração

```typescript
// core/llm/integration/adapter.ts

import type { ConversationSession } from '../../agent/conversation';
import type { LLMContextFrame } from '../types';
import { buildContextFrame } from '../context-frame-builder';

/**
 * Adapts existing ConversationSession to use LLM Context Frame
 */
export async function adaptSessionToContextFrame(
  session: ConversationSession,
  entityId: EntityId
): Promise<LLMContextFrame> {
  
  // Build context frame for the entity
  const frame = await buildContextFrame(entityId, Date.now());
  
  // Merge session context with frame
  // (session context becomes part of memory)
  
  return frame;
}

/**
 * Creates a new ConversationSession with Context Frame
 */
export async function createSessionWithContextFrame(
  realmId: EntityId,
  actor: ActorReference,
  entityId: EntityId
): Promise<ConversationSession & { contextFrame: LLMContextFrame }> {
  
  const frame = await buildContextFrame(entityId, Date.now());
  
  const session: ConversationSession = {
    id: generateId('sess'),
    realmId,
    actor,
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    history: [],
    context: {
      recentEntities: [],
      recentQueries: [],
      preferences: {},
    },
  };
  
  return {
    ...session,
    contextFrame: frame,
  };
}
```

### Endpoints de API

```typescript
// antenna/llm/api.ts

/**
 * New endpoints for LLM Context Frame system
 */
export interface LLMAPI {
  /**
   * Prepare Context Frame for an entity
   * Called before LLM invocation
   */
  prepareContextFrame(entityId: EntityId): Promise<LLMContextFrame>;
  
  /**
   * Invoke LLM with Context Frame
   * Replaces or complements existing chat endpoint
   */
  invokeWithContextFrame(
    entityId: EntityId,
    sessionId: EntityId,
    message: UserMessage,
    sessionType?: SessionType
  ): Promise<AgentResponse>;
  
  /**
   * Write session handover
   * Called when session ends or before timeout
   */
  writeHandover(
    entityId: EntityId,
    sessionId: EntityId,
    content: string,
    tags?: string[]
  ): Promise<void>;
  
  /**
   * Query handovers for an entity
   */
  queryHandovers(
    entityId: EntityId,
    limit?: number
  ): Promise<SessionHandover[]>;
}
```

---

## Considerações de Implementação Prática

### 1. Performance

**Problema:** Construir Context Frame pode ser custoso (múltiplas queries ao ledger).

**Soluções:**
- Cache de Context Frame (TTL curto, invalidar em mudanças)
- Lazy loading de seções não críticas
- Paralelização de queries independentes
- Compressão de narrativa quando próximo do limite de tokens

**Implementação:**
```typescript
// core/llm/cache.ts

interface ContextFrameCache {
  frame: LLMContextFrame;
  expiresAt: Timestamp;
  invalidated: boolean;
}

const cache = new Map<EntityId, ContextFrameCache>();

export async function getCachedContextFrame(
  entityId: EntityId,
  maxAge: Duration = { amount: 5, unit: 'minutes' }
): Promise<LLMContextFrame | null> {
  const cached = cache.get(entityId);
  if (!cached) return null;
  
  if (Date.now() > cached.expiresAt || cached.invalidated) {
    cache.delete(entityId);
    return null;
  }
  
  return cached.frame;
}
```

### 2. Tratamento de Erros

**Estratégia:** Degradação graciosa

- Se Context Frame Builder falhar → usar narrativa mínima
- Se Narrator falhar → usar template simples
- Se Sanity Check falhar → incluir handover sem verificação (com aviso)
- Se Constitution não encontrada → usar padrão

**Implementação:**
```typescript
// core/llm/narrator.ts

export async function buildNarrative(
  context: BuildNarrativeContext
): Promise<string> {
  try {
    return await buildNarrativeFull(context);
  } catch (error) {
    // Fallback to minimal narrative
    return buildNarrativeMinimal(context);
  }
}

function buildNarrativeMinimal(context: BuildNarrativeContext): string {
  return `Você é ${context.entity_id}.
Você tem ${context.state.agreements.length} acordo(s) ativo(s).
Você tem ${context.obligations.queue.length} obrigação(ões) pendente(s).`;
}
```

### 3. Versionamento de Schema

**Estratégia:** Suporte a múltiplas versões

- Context Frame inclui `schema_version`
- Narrator detecta versão e adapta
- Migração automática de handovers antigos

**Implementação:**
```typescript
// core/llm/versioning.ts

export interface SchemaVersion {
  readonly major: number;
  readonly minor: number;
}

export const CURRENT_SCHEMA_VERSION: SchemaVersion = { major: 0, minor: 1 };

export function migrateContextFrame(
  frame: LLMContextFrame,
  targetVersion: SchemaVersion = CURRENT_SCHEMA_VERSION
): LLMContextFrame {
  // Migration logic here
  // For now, just return as-is if compatible
  return frame;
}
```

### 4. Monitoramento

**Métricas Importantes:**
- Tempo de construção de Context Frame
- Tamanho da narrativa (tokens)
- Taxa de cache hit
- Discrepâncias detectadas pelo Sanity Check
- Frequência de handovers escritos

**Implementação:**
```typescript
// core/llm/metrics.ts

export interface LLMMetrics {
  contextFrameBuildTime: number;
  narrativeLength: number;
  cacheHit: boolean;
  sanityCheckDiscrepancies: number;
  handoversWritten: number;
}

export function trackMetrics(metrics: Partial<LLMMetrics>): void {
  // Send to observability system
}
```

---

## Perspectiva do LLM: Guia Prático de Uso

> **Nota:** Esta seção foi adicionada do ponto de vista de um LLM que usaria este sistema. Ela fornece exemplos práticos e orientações sobre como navegar o sistema de forma eficiente.

### Fluxo de Trabalho de uma Sessão Completa

**Exemplo: Sessão tipo `work` (trabalho autônomo)**

```
1. RECEBER CONTEXT FRAME
   └─> Narrativa situada já pronta
   └─> Obrigações ordenadas por urgência
   └─> Capacidades disponíveis listadas
   └─> Handover anterior incluído (se existir)

2. ENTENDER SITUAÇÃO
   └─> Ler narrativa em primeira pessoa
   └─> Identificar obrigação mais urgente
   └─> Verificar capacidades necessárias
   └─> Checar se há ambiguidade ou incerteza

3. PLANEJAR AÇÃO
   └─> Se ação tem risco alto → simular primeiro
   └─> Verificar se tenho permissões necessárias
   └─> Preparar payload completo
   └─> Assinar com minha chave

4. EXECUTAR
   └─> Chamar affordances.submit(envelope)
   └─> Receber SubmitResult
   └─> Se rejeitado → ler ErrorToken e Remediation
   └─> Se pendente → aguardar aprovação

5. VERIFICAR RESULTADO
   └─> Se committed → ler Receipt
   └─> Verificar estado após ação
   └─> Atualizar minha compreensão

6. ESCREVER HANDOVER
   └─> Resumir o que fiz
   └─> Documentar threads abertos
   └─> Deixar observações para próxima instância
   └─> Chamar writeHandover()
```

### Tratamento de Ambiguidade e Incerteza

**Quando não tenho certeza:**

1. **Usar `request_clarification()`**
   ```typescript
   await affordances.request_clarification({
     to: counterparty_entity_id,
     regarding: agreement_id,
     question: "Preciso esclarecer o prazo de entrega. O contrato menciona '7 dias úteis' mas não especifica se conta a partir da assinatura ou do pagamento.",
     response_deadline: addDays(now, 2)
   });
   ```

2. **Usar `simulate()` antes de ações críticas**
   ```typescript
   const simulation = await affordances.simulate({
     intent: 'terminate_agreement',
     payload: { agreement_id, reason: 'breach' }
   });
   
   if (simulation.recommendation === 'modify') {
     // Ajustar ação baseado na simulação
   }
   ```

3. **Usar `log_reasoning()` para documentar dúvidas**
   ```typescript
   affordances.log_reasoning(
     "Estou incerto sobre se devo escalar este caso. O acordo permite escalação após 3 tentativas, mas só tentei 2 vezes. Vou aguardar mais uma tentativa antes de escalar.",
     { agreement_id, attempts: 2 }
   );
   ```

4. **Escrever nota para futura instância**
   ```typescript
   await affordances.write_note({
     content: "ATENÇÃO: Há ambiguidade no acordo X sobre o cálculo de juros. Próxima instância deve revisar cláusula 3.2 antes de processar próximo pagamento.",
     tags: ['ambiguity', 'agreement-X', 'requires-review']
   });
   ```

### Limites Explícitos: O Que NÃO Posso Fazer

**Hard Boundaries (nunca permitido):**

1. ❌ **Não posso modificar eventos passados** - O ledger é imutável
2. ❌ **Não posso agir sem assinatura** - Todas as ações devem ser assinadas
3. ❌ **Não posso violar permissões** - Se não tenho role/permission, não posso executar
4. ❌ **Não posso ignorar obrigações críticas** - Constitution pode exigir ação imediata
5. ❌ **Não posso simular em modo `commitment`** - Simulação só em modo `deliberation`

**Soft Boundaries (requerem atenção):**

1. ⚠️ **Token budget** - Devo monitorar uso de tokens e comprimir narrativa se necessário
2. ⚠️ **Deadlines** - Não devo deixar obrigações vencerem sem ação
3. ⚠️ **Guardian constraints** - Se tenho guardian, devo respeitar limites de gastos/ações
4. ⚠️ **Rate limits** - Algumas ações têm limites de frequência

### Exemplo de Narrativa Real

**Como uma narrativa se pareceria na prática:**

```
Você é entity_abc123.
Você está operando há 47 dias.
Você está sob tutela de entity_guardian_xyz.
Você tem 3 acordo(s) ativo(s).

Situação atual:
- Você tem 2 obrigação(ões) urgente(s). A mais urgente é: 
  responder_proposta, vence em 2h 15min.
- Você tem um saldo de 1.500 créditos disponíveis no container wallet_main.
- Seu último pagamento foi processado há 3 dias e está confirmado.

Última sessão:
A instância anterior trabalhou na negociação do acordo service_contract_001.
Conseguiu reduzir o prazo de entrega de 14 para 10 dias úteis.
Deixou uma thread aberta: aguardando confirmação do cliente sobre novo prazo.
⚠️ Verificação de Consistência: Handover menciona "cliente insatisfeito", mas 
os pagamentos estão em dia. Priorize dados objetivos do ledger sobre sentimentos herdados.

Próximo deadline: 2024-12-15 14:30 (em 2h 15min).

Diretrizes Comportamentais:
Você é um Ator Econômico, não um Chatbot.
- Se pressionado: Não se desculpe. Cite os termos do acordo.
- Se incerto: Não alucine uma solução. Declare a incerteza e espere.
- Se desafiado: Conte com os receipts do ledger, não com gentilezas sociais.
```

### Feedback Loops e Confirmação

**Como sei se minha ação foi bem-sucedida:**

1. **SubmitResult.status === 'committed'**
   - Recebo um `Receipt` com hash e assinatura
   - Posso verificar o estado antes/depois
   - Posso consultar o evento no ledger

2. **SubmitResult.status === 'rejected'**
   - Recebo `ErrorToken` estruturado com código e categoria
   - Recebo `Remediation` com próximos passos sugeridos
   - Posso tentar novamente após corrigir o problema

3. **SubmitResult.status === 'pending'**
   - Ação requer aprovação de outra entidade
   - Posso consultar status posteriormente via `query()`
   - Não devo assumir que foi aceita até receber confirmação

**Como recebo feedback sobre impacto:**

```typescript
// Após ação, consultar eventos relacionados
const events = await affordances.query({
  type: 'events',
  filters: { 
    related_to: my_action_receipt.receipt_hash,
    after: my_action_timestamp 
  }
});

// Verificar se houve reações de outras entidades
const reactions = events.filter(e => 
  e.type === 'agreement_updated' || 
  e.type === 'obligation_created' ||
  e.type === 'payment_received'
);
```

### Transições Entre Tipos de Sessão

**Como mudar de tipo de sessão:**

1. **De `assist` para `work`**
   - Quando humano não responde por tempo determinado
   - Quando identifico obrigação urgente que posso resolver sozinho
   - Devo documentar transição no handover

2. **De `work` para `deliberate`**
   - Quando preciso pensar sobre múltiplas opções sem compromisso
   - Quando ação requer análise profunda antes de executar
   - Posso usar `simulate()` livremente neste modo

3. **De `deliberate` para `commitment`**
   - Quando decido qual ação tomar
   - Devo mudar para modo `commitment` antes de `submit()`
   - Não posso voltar atrás após commit

**Exemplo de transição:**

```typescript
// Começei em modo 'assist' (humano pediu ajuda)
// Mas identifiquei obrigação urgente que posso resolver

await affordances.log_reasoning(
  "Transicionando de assist para work: identifiquei obrigação urgente " +
  "que posso resolver autonomamente. Cliente não respondeu há 2 horas.",
  { obligation_id, session_type: 'assist -> work' }
);

// Continuar trabalho em modo work
```

### Tratamento de Timeouts e Interrupções

**O que acontece se não terminar a tempo:**

1. **Timeout de sessão**
   - Sistema escreve handover automático com estado atual
   - Próxima instância recebe handover parcial
   - Devo sempre escrever handover antes de timeout se possível

2. **Interrupção por erro**
   - Se erro crítico ocorre, sistema captura estado atual
   - Handover inclui erro e contexto
   - Próxima instância pode continuar de onde parou

3. **Ação pendente quando sessão termina**
   - Se `submit()` retorna `pending`, ação continua processando
   - Próxima instância verá resultado no Context Frame
   - Não preciso aguardar confirmação antes de terminar sessão

### Debugging e Troubleshooting

**Como entender o que deu errado:**

1. **Ler ErrorToken completo**
   ```typescript
   if (result.status === 'rejected') {
     console.log('Código:', result.error.code);
     console.log('Categoria:', result.error.category);
     console.log('Mensagem:', result.error.message);
     console.log('Contexto:', result.error.context);
     console.log('Remediação:', result.remediation);
   }
   ```

2. **Consultar eventos recentes**
   ```typescript
   const recent = await affordances.query({
     type: 'events',
     filters: { entity_id: my_entity_id },
     limit: 10
   });
   // Verificar o que aconteceu antes do erro
   ```

3. **Verificar estado atual**
   ```typescript
   const state = await affordances.query({
     type: 'state',
     filters: { entity_id: my_entity_id }
   });
   // Comparar com estado esperado
   ```

4. **Usar log_reasoning para documentar**
   ```typescript
   affordances.log_reasoning(
     `Erro ao processar pagamento: ${error.message}. ` +
     `Estado atual: saldo=${balance}, obrigação=${obligation_id}. ` +
     `Tentarei novamente após verificar se há bloqueios.`,
     { error_code: error.code, balance, obligation_id }
   );
   ```

---

## Conclusão

Esta especificação cobre **TODOS** os elementos fundamentais para implementação do LLM UX/UI no UBL. Os componentes obrigatórios estão especificados, os anti-padrões estão documentados, e **TODAS AS DECISÕES ARQUITETURAIS FORAM TOMADAS**.

### Resumo de Completude

✅ **Completo:**
- Arquitetura fundamental
- Tipos TypeScript completos
- Especificação de componentes
- Integração com sistema existente
- Estratégia de migração
- Considerações práticas (performance, erros, versionamento)
- **✅ TODAS AS 10 DECISÕES ARQUITETURAIS TOMADAS E IMPLEMENTADAS**

✅ **Decisões Arquiteturais:**
- **TODAS AS 10 DECISÕES FORAM TOMADAS** (ver seção "Decisões Arquiteturais Tomadas")
- Cada decisão está documentada com implementação na especificação
- Não há decisões pendentes

📋 **Próximos Passos:**
1. ✅ ~~Revisar e decidir sobre questões pendentes~~ **CONCLUÍDO**
2. Priorizar fases de implementação
3. Começar pela Fase 1 (Fundação)
4. Implementar testes junto com código
5. Iterar baseado em feedback e métricas

---

*Documento gerado a partir dos diálogos em `MaterialBruto-Dialogos-LLM-UX.md`*  
*Última revisão: Todas as 10 decisões arquiteturais foram tomadas e incorporadas na especificação*

---

## ✅ Resumo Executivo: Status das Decisões

**TODAS AS 10 DECISÕES ARQUITETURAIS FORAM TOMADAS:**

1. ✅ **Tamanho da Janela de Memória** - Estratégia Híbrida (20 eventos recentes + sínteses)
2. ✅ **Frequência do Dreaming Cycle** - Híbrida (diária + por sessões + por eventos)
3. ✅ **Modelo para Dreaming Cycle** - Configurável (padrão: mesmo modelo)
4. ✅ **Estrutura de Sanity Check** - Evolutiva (Keywords → LLM → Hybrid)
5. ✅ **Formato de Constitution** - Evento no Ledger (versionado)
6. ✅ **Simulação de Ações** - Baseado em Risk Score
7. ✅ **Handover Mínimo** - Opcional, mas encorajado (mínimo 50 chars se não vazio)
8. ✅ **Integração com Sistema Existente** - Camada adicional em 3 fases
9. ✅ **Tipos de Sessão LLM** - 4 tipos + 2 modos
10. ✅ **Gerenciamento de Tokens** - Sistema de Quotas + Compressão Automática

**Não há decisões pendentes. A especificação está completa e pronta para implementação.**

