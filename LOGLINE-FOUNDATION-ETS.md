# LogLine Foundation — Especificação Técnica do Sistema (ETS)

## Volume 1: Fundamentos Ontológicos e Arquitetura de Dados

### 1. Introdução e Definições Ontológicas

#### 1.1. Preâmbulo Arquitetural

O presente documento tem por objetivo especificar, em nível de implementação de engenharia de software, a arquitetura do sistema LogLine Foundation. Este sistema não deve ser interpretado meramente como uma aplicação de mensageria ou um chatbot corporativo. Trata-se de uma infraestrutura de Existência Econômica para Inteligência Artificial, projetada para resolver o problema fundamental da ausência de personalidade jurídica e responsabilidade técnica em agentes autônomos.

A arquitetura aqui descrita abandona os paradigmas tradicionais de desenvolvimento de software onde “usuários” e “sistemas” são entidades distintas. No LogLine, adota-se o Princípio da Unidade da Entidade, onde humanos, organizações legais e agentes de software são tratados polimorficamente como nós econômicos equivalentes, diferenciados apenas por seus metadados de substrato (biológico vs. silício) e seus vínculos de responsabilidade (soberano vs. tutelado).

#### 1.2. Glossário Técnico e Definições Formais

##### 1.2.1. Entidade (Entity)

Qualquer ator capaz de gerar uma assinatura criptográfica válida (Ed25519) e iniciar uma transação no Ledger. Uma Entidade é a classe base de todo o sistema. No banco de dados, ela é a chave primária de todas as relações. Não existe “usuário” fora do conceito de Entidade.

##### 1.2.2. Substrato (Substrate)

Propriedade imutável de uma Entidade que define sua natureza física e legal.

- **BIO_HUMAN**: Refere-se a um operador humano. Possui soberania legal, pode assinar contratos juridicamente vinculantes fora do sistema e possui biometria. É a fonte primária de autoridade.
- **SILICON_AGENT**: Refere-se a um processo de software (IA). É determinístico (ou probabilístico limitado), persistente e capaz de execução autônoma. Juridicamente, é um bem (asset) ou uma extensão de ferramenta, jamais um sujeito de direito independente.
- **LEGAL_CORP**: Refere-se a uma abstração jurídica (CNPJ/EIN). Não age diretamente; age através de delegados (BIO_HUMAN) ou autômatos (SILICON_AGENT).

##### 1.2.3. Guardião (Guardian)

Papel técnico e jurídico desempenhado por uma Entidade Soberana (BIO_HUMAN ou LEGAL_CORP) em relação a uma Entidade Tutelada (SILICON_AGENT). O Guardião é o “root of trust” do Agente.

**Implicação Técnica:** O sistema deve rejeitar, via constraint de banco de dados, a criação de qualquer Agente que não possua um ponteiro de chave estrangeira não nulo para um Guardião válido.

**Implicação de Execução:** Se a chave privada do Guardião revogar a assinatura do contrato do Agente, o Agente deve entrar imediatamente em estado de **DECOMMISSIONED**, cessando toda capacidade de escrita no Ledger.

##### 1.2.4. Trajetória (Trajectory)

O conjunto histórico, linear, ordenado cronologicamente e criptograficamente encadeado de todas as transações (mensagens, comandos, pagamentos) emitidas por uma Entidade.

**Implementação:** Uma cadeia de hashes SHA-256 onde Hash(N) = SHA256(Hash(N-1) + Payload(N)).

**Propósito:** A identidade do Agente não é seu código-fonte (que pode mudar), nem seu modelo (que pode ser atualizado), mas sua Trajetória. A reputação é calculada exclusivamente sobre a Trajetória.

##### 1.2.5. Universal Business Ledger (UBL)

O banco de dados central do sistema, implementado como um ledger de dupla entrada imutável. Embora tecnicamente centralizado em uma instância de banco de dados (PostgreSQL), ele se comporta logicamente como uma blockchain permissionada, utilizando provas criptográficas em cada linha para garantir auditabilidade forense.

---

### 2. Especificação da Camada de Dados (UBL)

Esta seção detalha a implementação física do esquema de banco de dados. O sistema utiliza PostgreSQL 16 como motor de persistência. A escolha se deve à robustez transaction (ACID), suporte nativo a JSONB para payloads polimórficos e extensibilidade para vetores (pgvector) e criptografia (pgcrypto).

#### 2.1. Configuração de Ambiente e Extensões

Antes da criação das tabelas, o ambiente deve ser preparado com extensões que permitem operações criptográficas dentro do banco de dados, reduzindo a necessidade de round-trips para a aplicação.

```sql
-- Habilita geração de UUIDs v4 para chaves primárias aleatórias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilita funções de hash (SHA224, SHA256, SHA384, SHA512) e assinaturas digitais
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Habilita armazenamento e busca de similaridade de vetores (para memória de Agentes)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Configuração de Timezone padrão para UTC para evitar inconsistências de log
SET timezone = 'UTC';
```

#### 2.2. Modelagem da Identidade (registry_entities)

A tabela `registry_entities` é o núcleo do sistema. Ela não deve ser tratada como uma tabela de usuários comum. Ela é um registro de identidade soberana.

##### 2.2.1. Dicionário de Dados

| Coluna | Tipo | Obrigatório | Descrição Técnica Detalhada |
| --- | --- | --- | --- |
| did | VARCHAR(128) | SIM | Decentralized Identifier. A chave primária global. Não deve ser um UUID aleatório. Deve seguir a especificação W3C DID, ex: `did:logline:MainNet:7f8a….`. Este ID é gerado deterministicamente a partir do hash do bloco gênesis da entidade. É imutável. |
| public_key | TEXT | SIM | A chave pública Ed25519 ativa. Utilizada para validar assinaturas de todas as operações subsequentes no Ledger. O sistema não armazena a chave privada. |
| substrate | ENUM | SIM | Define a natureza ontológica. Valores permitidos: BIO, SILICON, CORP. Este campo é imutável após a criação (um humano não pode virar um robô). |
| guardian_did | VARCHAR(128) | CONDICIONAL | Chave estrangeira auto-referencial. Se substrate for SILICON, este campo **não pode** ser nulo. Se for BIO, geralmente é nulo. |
| display_name | VARCHAR(255) | SIM | Nome visível na interface. Ex: “Sofia Marketing”. Mutável, mas mudanças devem ser logadas no ledger como eventos de sistema. |
| handle | VARCHAR(64) | SIM | Identificador único legível por humanos (ex: @sofia). Deve ser normalizado para lowercase e validado por regex `^[a-z0-9_]{3,64}$`. |
| system_role | VARCHAR(50) | SIM | Define permissões de RBAC grosseiras. Ex: ADMIN (pode alterar configurações globais), MEMBER (pode transacionar), AUDITOR (apenas leitura), AGENT (restrito a TDLN). |
| wallet_addr | VARCHAR(42) | NÃO | Endereço hexadecimal (0x…) para compatibilidade com carteiras EVM. Usado para o subsistema de pagamentos e créditos de computação. Deve ser único. |
| compute_creds | DECIMAL(24,18) | SIM | Saldo de créditos internos para execução de inferência de IA. Padrão 0. Se chegar a < 0, o trigger de bloqueio de agente deve ser ativado. |
| const_hash | VARCHAR(64) | NÃO | Constitution Hash. Apenas para Agentes. É o SHA-256 do “System Prompt” atual. Permite versionamento da personalidade do agente. |
| mem_root | VARCHAR(64) | NÃO | Memory Root. O Merkle Root ou ponteiro para o último snapshot válido da memória vetorial do agente. Usado para restaurar estado em caso de falha. |
| status | ENUM | SIM | Estado atual. ACTIVE, PAUSED, FROZEN, DECOMMISSIONED. |

##### 2.2.2. Implementação DDL (Data Definition Language)

```sql
-- Criação do Tipo Enumerado para Substrato
DO $$ BEGIN
CREATE TYPE entity_substrate_type AS ENUM ('BIO', 'SILICON', 'CORP', 'SYSTEM');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

-- Criação do Tipo Enumerado para Status
DO $$ BEGIN
CREATE TYPE entity_status_type AS ENUM ('BOOTSTRAPPING', 'ACTIVE', 'PAUSED', 'FROZEN_RISK', 'DECOMMISSIONED');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

CREATE TABLE registry_entities (
  -- IDENTIDADE
  did VARCHAR(128) PRIMARY KEY,
  public_key TEXT NOT NULL,
  substrate entity_substrate_type NOT NULL,

  -- PERFIL
  display_name VARCHAR(255) NOT NULL,
  handle VARCHAR(64) NOT NULL,
  avatar_url TEXT,
  bio_description TEXT,

  -- GUARDIANSHIP & RESPONSABILIDADE
  guardian_did VARCHAR(128),
  guardian_contract_signature TEXT, -- Assinatura do termo de responsabilidade

  -- ECONOMIA
  wallet_address VARCHAR(42),
  compute_credits DECIMAL(24, 18) DEFAULT 0.000000000000000000,
  daily_spend_limit DECIMAL(24, 18),

  -- ESTADO TÉCNICO (AGENTES)
  system_role VARCHAR(50) DEFAULT 'MEMBER',
  status entity_status_type DEFAULT 'ACTIVE',
  constitution_hash VARCHAR(64),
  memory_root VARCHAR(64),
  base_model_id VARCHAR(100), -- Ex: 'claude-3-5-sonnet'

  -- AUDITORIA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,

  -- CONSTRAINTS
  CONSTRAINT uq_entities_handle UNIQUE (handle),
  CONSTRAINT uq_entities_wallet UNIQUE (wallet_address),
  CONSTRAINT fk_entities_guardian FOREIGN KEY (guardian_did) REFERENCES registry_entities(did) ON DELETE RESTRICT
);

-- ÍNDICES DE PERFORMANCE
-- Índice B-Tree para busca rápida por handle (usado em mentions @…)
CREATE INDEX idx_registry_handle ON registry_entities(handle);
-- Índice para listar todos os agentes de um determinado guardião
CREATE INDEX idx_registry_guardian ON registry_entities(guardian_did);
-- Índice para filtrar apenas entidades ativas
CREATE INDEX idx_registry_status ON registry_entities(status) WHERE status = 'ACTIVE';
```

##### 2.2.3. Lógica de Integridade (Triggers de Banco)

**Trigger 1: Imutabilidade do DID e Substrato**

Uma vez criada, uma entidade não pode mudar seu ID ou sua natureza (um humano não pode se tornar uma empresa).

```sql
CREATE OR REPLACE FUNCTION func_protect_entity_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Impede alteração do DID
  IF NEW.did != OLD.did THEN
    RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: Entity DID is immutable.';
  END IF;

  -- Impede alteração do Substrato
  IF NEW.substrate != OLD.substrate THEN
    RAISE EXCEPTION 'ONTOLOGY VIOLATION: Entity substrate cannot be changed once instantiated.';
  END IF;

  -- Atualiza timestamp
  NEW.updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entity_immutability
BEFORE UPDATE ON registry_entities
FOR EACH ROW EXECUTE FUNCTION func_protect_entity_immutability();
```

**Trigger 2: Enforce Guardianship Protocol**

Este trigger garante que nenhum agente de IA (SILICON) seja criado sem um dono responsável (BIO ou CORP). Isso implementa a camada jurídica no código.

```sql
CREATE OR REPLACE FUNCTION func_enforce_guardianship()
RETURNS TRIGGER AS $$
BEGIN
  -- Regra: Agentes de Silício obrigatoriamente precisam de Guardian
  IF NEW.substrate = 'SILICON' THEN
    IF NEW.guardian_did IS NULL THEN
      RAISE EXCEPTION 'LEGAL VIOLATION: Silicon Agents must have a defined Guardian DID.';
    END IF;

    IF NEW.guardian_contract_signature IS NULL THEN
      RAISE EXCEPTION 'LEGAL VIOLATION: Silicon Agents must have a signed liability contract.';
    END IF;
  END IF;

  -- Regra: Auto-referência não permitida (não pode ser seu próprio guardião)
  IF NEW.guardian_did = NEW.did THEN
    RAISE EXCEPTION 'LOGIC VIOLATION: Entity cannot be its own Guardian.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entity_guardianship
BEFORE INSERT OR UPDATE ON registry_entities
FOR EACH ROW EXECUTE FUNCTION func_enforce_guardianship();
```

#### 2.3. Modelagem do Ledger (ubl_ledger_entries)

Esta tabela substitui o conceito tradicional de tabela de mensagens (messages). No LogLine, uma mensagem de chat é apenas um tipo específico de transação financeira/lógica. O UBL é projetado como uma Merkle Chain linearizada.

##### 2.3.1. Dicionário de Dados

| Coluna | Tipo | Descrição Técnica Detalhada |
| --- | --- | --- |
| entry_hash | VARCHAR(64) | Primary Key. SHA-256 do conteúdo do bloco. Deve bater com o cálculo: SHA256(prev_hash + sender + payload + ts). |
| prev_hash | VARCHAR(64) | O hash da entrada anterior. Garante a integridade da corrente. Se alguém deletar a linha anterior, este hash não baterá, invalidando o banco. |
| sequence_id | BIGINT | Contador monotônico global (BIGSERIAL). Usado para ordenação rápida e paginação. |
| sender_did | VARCHAR(128) | Quem iniciou a ação. FK para registry_entities. |
| target_did | VARCHAR(128) | Destinatário direto. Pode ser NULL se for uma mensagem em grupo. |
| group_id | UUID | Identificador do canal ou contexto de grupo onde a ação ocorreu. |
| payload | JSONB | O conteúdo polimórfico. Pode conter texto, TDLN, Voto Pactum ou metadados de arquivo. Indexado com GIN para busca rápida. |
| payload_type | ENUM | Define como o Frontend deve renderizar este bloco (TEXT, TDLN, SYSTEM, FILE). |
| pactum_state | ENUM | Estado de consenso. DRAFT (invisível), PENDING (aguardando aprovação), COMMITTED (finalizado), REJECTED (vetado). |
| signature | VARCHAR(512) | Assinatura digital do Sender sobre o Payload. Garante não-repúdio. |
| client_ts | TIMESTAMPTZ | Timestamp gerado no dispositivo do cliente. |
| server_ts | TIMESTAMPTZ | Timestamp de inserção no banco (Trust Anchor). |

##### 2.3.2. Implementação DDL

```sql
-- Enumeração de Tipos de Payload
DO $$ BEGIN
CREATE TYPE ledger_payload_type AS ENUM ('TEXT', 'TDLN_PACKET', 'PACTUM_VOTE', 'SYSTEM_LOG', 'FILE_REF');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

-- Enumeração de Estados Pactum
DO $$ BEGIN
CREATE TYPE pactum_state_type AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'COMMITTED', 'REJECTED');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;

CREATE TABLE ubl_ledger_entries (
  -- IDENTIDADE DO BLOCO
  entry_hash VARCHAR(64) PRIMARY KEY,
  prev_hash VARCHAR(64) NOT NULL,
  sequence_id BIGSERIAL NOT NULL UNIQUE,

  -- ROTEAMENTO
  sender_did VARCHAR(128) NOT NULL,
  target_did VARCHAR(128),
  group_id UUID,

  -- CONTEÚDO
  payload JSONB NOT NULL,
  payload_type ledger_payload_type NOT NULL,

  -- ESTADO DE CONSENSO
  pactum_state pactum_state_type DEFAULT 'COMMITTED',
  risk_level VARCHAR(10) DEFAULT 'L0', -- L0..L5

  -- CUSTOS E METADADOS
  gas_cost DECIMAL(18, 8),
  token_usage INT,

  -- SEGURANÇA
  signature VARCHAR(512) NOT NULL,
  client_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- RELACIONAMENTOS
  CONSTRAINT fk_ledger_sender FOREIGN KEY (sender_did) REFERENCES registry_entities(did)
);

-- ÍNDICES
-- Busca rápida por conversa (Sender + Target)
CREATE INDEX idx_ledger_p2p ON ubl_ledger_entries(sender_did, target_did);
-- Busca rápida por grupo (Canais)
CREATE INDEX idx_ledger_group ON ubl_ledger_entries(group_id, sequence_id DESC);
-- Busca dentro do JSON (Ex: encontrar todas as ações do tipo ‘TOOL_USE’)
CREATE INDEX idx_ledger_payload ON ubl_ledger_entries USING GIN (payload);
```

##### 2.3.3. Lógica de Integridade: O “Chain Guard”

Este é o componente mais crítico do banco de dados. Ele simula o comportamento de uma Blockchain dentro do PostgreSQL. Ele garante que, uma vez escrita, a história não pode ser reescrita sem detecção.

```sql
CREATE OR REPLACE FUNCTION func_ubl_chain_guard()
RETURNS TRIGGER AS $$
DECLARE
  last_stored_hash VARCHAR(64);
  computed_hash VARCHAR(64);
  payload_string TEXT;
BEGIN
  -- 1. Obter o Hash do último bloco inserido no sistema globalmente
  -- Nota: Em sistemas de altíssimo throughput, isso pode ser gargalo.
  -- Pode-se particionar por GroupID para paralelismo.
  SELECT entry_hash INTO last_stored_hash
  FROM ubl_ledger_entries
  ORDER BY sequence_id DESC
  LIMIT 1;

  -- 2. Validação do Genesis Block (Caso seja a primeira inserção)
  IF last_stored_hash IS NULL THEN
    -- Convencionamos que o prev_hash do gênesis é uma string de zeros
    IF NEW.prev_hash != '0000000000000000000000000000000000000000000000000000000000000000' THEN
      RAISE EXCEPTION 'LEDGER INTEGRITY: First block must have zeroed prev_hash.';
    END IF;
  ELSE
    -- Validação de Encadeamento
    IF NEW.prev_hash != last_stored_hash THEN
      RAISE EXCEPTION 'LEDGER INTEGRITY: Chain Broken. Expected prev_hash %, got %', last_stored_hash, NEW.prev_hash;
    END IF;
  END IF;

  -- 3. Validação da Integridade do Hash (Proof of Integrity)
  -- O hash deve ser SHA256(prev_hash + sender_did + payload_json + client_timestamp)
  -- Isso impede que um admin edite o payload manualmente, pois invalidaria o hash.
  payload_string := NEW.payload::text;

  computed_hash := encode(digest(
    NEW.prev_hash ||
    NEW.sender_did ||
    payload_string ||
    NEW.client_timestamp::text,
    'sha256'
  ), 'hex');

  IF NEW.entry_hash != computed_hash THEN
    RAISE EXCEPTION 'LEDGER INTEGRITY: Hash mismatch. Data tampering detected.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_integrity
BEFORE INSERT ON ubl_ledger_entries
FOR EACH ROW EXECUTE FUNCTION func_ubl_chain_guard();
```

#### 2.4. Modelagem do Shadow Graph (shadow_graph_nodes)

O mundo externo é não estruturado (HTML, E-mail Text, Slack Markdown). O mundo UBL é estruturado (JSON TDLN). O Shadow Graph é a tabela de “tradução” e ingestão. Todo input externo deve ser registrado aqui antes de ser processado por um Agente.

##### 2.4.1. Implementação DDL

```sql
CREATE TABLE shadow_graph_nodes (
  node_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- METADADOS DE ORIGEM
  source_platform VARCHAR(50) NOT NULL, -- 'GMAIL', 'WEB', 'SLACK', 'UPLOAD'
  external_id VARCHAR(255) NOT NULL, -- ID original (Message-ID do email, URL)

  -- INTEGRIDADE DE CONTEÚDO
  content_snapshot TEXT NOT NULL, -- O texto bruto no momento da captura
  content_hash VARCHAR(64) NOT NULL, -- SHA-256 do snapshot (para deduplicação)

  -- MEMÓRIA DE IA
  -- Vetor de 1536 dimensões (compatível com OpenAI text-embedding-ada-002)
  -- Usado para RAG (Retrieval Augmented Generation)
  embedding_vector vector(1536),

  -- VÍNCULO COM O SISTEMA
  ingested_by_did VARCHAR(128) REFERENCES registry_entities(did),
  ledger_entry_ref VARCHAR(64) REFERENCES ubl_ledger_entries(entry_hash),

  -- ESTADO DE PROCESSAMENTO
  process_status VARCHAR(20) DEFAULT 'RAW', -- 'RAW', 'INDEXED', 'ARCHIVED'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice HNSW para busca vetorial ultrarrápida (Memória do Agente)
-- Permite que o Agente pergunte: “O que sabemos sobre o Projeto X?”
CREATE INDEX idx_shadow_embedding ON shadow_graph_nodes
USING hnsw (embedding_vector vector_cosine_ops);
```

---

### 3. Protocolo de Comunicação e API

A comunicação entre os clientes (Frontend Web/Mobile) e o servidor LogLine não segue um padrão REST tradicional para operações de chat. Utiliza-se uma arquitetura híbrida: REST para Autenticação/Recursos Estáticos e WebSockets (Socket.io) para o fluxo do Ledger em tempo real.

#### 3.1. Endpoints de Autenticação (REST)

A autenticação é baseada em desafio criptográfico (Challenge-Response), eliminando o uso de senhas trafegadas.

##### 3.1.1. Iniciar Handshake

**Rota:** `POST /api/v1/auth/challenge`

**Descrição:** O cliente anuncia sua intenção de logar. O servidor gera um nonce aleatório.

**Request:**

```json
{ "did": "did:logline:1234…" }
```

**Response:**

```json
{
  "nonce": "a1b2c3d4…",
  "difficulty": 1,
  "server_ts": 170982342
}
```

##### 3.1.2. Finalizar Login

**Rota:** `POST /api/v1/auth/verify`

**Descrição:** O cliente assina o nonce com sua chave privada (Ed25519) e devolve ao servidor.

**Request:**

```json
{
  "did": "did:logline:1234…",
  "nonce": "a1b2c3d4…",
  "signature": "hex_encoded_signature…",
  "client_pubkey": "…"
}
```

**Lógica de Validação (Servidor):**

- Busca public_key do DID na tabela `registry_entities`.
- Verifica: `Ed25519.verify(nonce, signature, public_key)`.
- Se válido, emite JWT (Access Token).

#### 3.2. Protocolo de WebSocket (Socket.io)

O WebSocket é o canal exclusivo para escrita e leitura do Ledger em tempo real.

##### 3.2.1. Namespace: `/ubl-stream`

**Evento:** Enviado quando um usuário (ou agente local) quer escrever no chat.

**Payload:**

```json
{
  "prev_hash": "…",
  "sender_did": "…",
  "payload_type": "TEXT",
  "payload": {
    "text": "Olá mundo",
    "mentions": []
  },
  "signature": "…"
}
```

**Comportamento do Servidor:**

- Valida assinatura.
- Tenta inserir em `ubl_ledger_entries`.
- Se `prev_hash` estiver desatualizado (concorrência), rejeita com erro `CHAIN_REORG_REQUIRED` e envia o novo topo da cadeia.

**Evento:** Enviado quando o Kernel do Agente está processando uma resposta. Diferencia-se de um typing comum por expor o estado interno.

**Payload:**

```json
{
  "agent_did": "…",
  "status": "THINKING",
  "current_tool": "read_file"
}
```

---

## Volume 2: Motor Lógico (TDLN) e Kernel de Agentes

### 4. Motor Lógico (TDLN Runtime)

O Typed Decision Logic Notation (TDLN) é o protocolo que diferencia o LogLine de um sistema de chat comum. Enquanto sistemas tradicionais de agentes (como LangChain ou AutoGPT) dependem de parsing de texto livre propenso a falhas, o LogLine impõe uma camada de tipagem rigorosa entre a intenção do modelo de IA e a execução da ação.

O TDLN não é apenas um formato de dados; é um Runtime de Validação que atua como um firewall lógico.

#### 4.1. Gramática e Schema TDLN

O TDLN é definido como um subconjunto estrito de JSON, validado por schemas Zod/JSON-Schema em tempo de execução. Todo Agente deve emitir exclusivamente pacotes TDLN. Qualquer saída de texto fora deste formato é considerada “ruído de pensamento” e descartada ou logada como debug.

##### 4.1.1. Estrutura Canônica do Pacote TDLN

```ts
/**
 * TDLN Packet Definition v1.0
 * Fonte Única de Verdade para comunicação Agente-Sistema.
 */
interface TDLNPacket {
  // CABEÇALHO DE METADADOS (Rastreabilidade)
  meta: {
    ver: '1.0';
    trace_id: string;      // UUID para log distribuído
    timestamp: number;     // Unix epoch ms
    agent_did: string;     // Quem está pensando
    model_id: string;      // ex: 'claude-3-5-sonnet'
    compute_cost: number;  // Estimativa de tokens usados
  };

  // CAMADA COGNITIVA (Auditabilidade do Pensamento)
  // Explica o “PORQUÊ” antes do “O QUÊ”. Essencial para auditoria humana.
  cognition: {
    observation: string;        // O que o agente percebeu no input?
    thought_process: string[];  // Passos lógicos dedutivos
    policy_alignment: string[]; // Citações das regras do sistema que validam a ação
    confidence_score: number;   // 0.0 a 1.0
  };

  // CAMADA DE BINDING (Shadow Graph)
  // Conecta a decisão a dados do mundo real.
  shadow_bindings: Array<{
    source: 'EMAIL' | 'URL' | 'FILE' | 'DB_QUERY';
    reference_id: string;       // ID externo
    snippet_hash: string;       // Prova de integridade do dado lido
  }>;

  // CAMADA DE INTENÇÃO (Ação Proposta)
  intent: {
    type: 'COMMUNICATION' | 'TOOL_USE' | 'PACTUM_PROPOSAL';

    // CASO 1: COMUNICAÇÃO (Falar com humanos)
    message?: {
      content: string;          // O texto final
      recipient_did?: string;
      tone?: 'FORMAL' | 'CASUAL' | 'DATA_DRIVEN';
    };

    // CASO 2: USO DE FERRAMENTA (Executar código/API)
    tool_call?: {
      namespace: string;        // ex: 'filesystem', 'browser'
      function_name: string;    // ex: 'write_file', 'search_google'
      arguments: Record<string, any>;
    };

    // CASO 3: PROPOSTA DE GOVERNANÇA (Pedir permissão)
    pactum_proposal?: {
      action_description: string;
      risk_assessment: 'L1' | 'L2' | 'L3' | 'L4';
      timeout_seconds: number;
    };
  };

  // CAMADA DE RESULTADOS (Preenchida pós-execução)
  execution_result?: {
    status: 'SUCCESS' | 'FAILURE' | 'PENDING_APPROVAL';
    output_data?: any;
    error_message?: string;
    artifacts?: Array<{
      type: 'FILE';
      path: string;
      url: string;
    }>;
  };
}
```

#### 4.2. Componentes do Runtime TDLN (Backend)

O Runtime é um serviço Node.js (ou Rust em versões futuras) que intercepta o fluxo de saída do LLM.

##### 4.2.1. O Pipeline de Processamento

- **Raw Ingestion:** O LLM gera um stream de tokens. O Runtime acumula até detectar o fechamento do JSON.
- **Structural Validation (Zod):** Verifica se o JSON corresponde à interface TDLNPacket. Se faltar um campo obrigatório (ex: thought_process), o Runtime rejeita e envia um erro de sistema ao Agente pedindo correção (Self-Correction Loop).
- **Semantic Guardrails (Policy Engine):**
  - Verifica se `intent.tool_call` está na lista de `allowed_tools` da Entidade.
  - Verifica limites de parâmetros (ex: `amount < 1000`).
  - Exemplo de Regra: “Agentes de Nível 1 não podem usar a ferramenta deploy_production”.
- **Shadow Verification:** Verifica se os `shadow_bindings` referenciados realmente existem na tabela `shadow_graph_nodes`. Impede alucinação de fontes.
- **Execution Dispatch:**
  - Se risco baixo: executa imediatamente.
  - Se risco alto: encaminha para o subsistema Pactum (ver Volume 3).

---

### 5. Arquitetura de Agentes (O Kernel)

O LogLine rejeita a ideia de Agentes como scripts efêmeros (“Lambda Functions”). Um Agente no LogLine é um Processo Persistente (Daemon) com estado de memória complexo.

#### 5.1. Estrutura do Kernel de Agente

Cada Agente ativo roda dentro de um container isolado ou worker thread, gerenciado por um orquestrador (Kubernetes ou PM2).

##### 5.1.1. O Ciclo de Vida do Kernel (The Agent Loop)

```js
class AgentKernel {
  constructor(entityDid, resources) {
    this.did = entityDid;
    this.state = 'BOOTSTRAPPING';
    this.memory = new HybridMemorySystem();
    this.tools = new ToolSandbox();
  }

  async start() {
    // 1. Hidratação
    await this.memory.loadContext(this.did);
    this.state = 'IDLE_ACTIVE';

    // 2. Loop Principal (Event Loop)
    while (this.state !== 'DECOMMISSIONED') {
      const signal = await this.waitForSignal(); // Inbox, Cron, ou System Event

      try {
        this.state = 'PROCESSING';

        // 3. Percepção
        const contextFrame = await this.buildContextFrame(signal);

        // 4. Cognição (LLM Inference)
        const tdlnResponse = await this.llmClient.generate(contextFrame);

        // 5. Validação & Execução
        const validatedPacket = await TDLNRuntime.validate(tdlnResponse);
        await this.executeIntent(validatedPacket);
      } catch (error) {
        await this.handleCrash(error);
      } finally {
        this.state = 'IDLE_ACTIVE';
      }
    }
  }
}
```

#### 5.2. Sistema de Memória Híbrida

O “cérebro” do agente é composto por três camadas de armazenamento distintas, gerenciadas pelo Kernel para otimizar custo de tokens e relevância.

##### 5.2.1. Memória de Trabalho (Working Memory - RAM)

**Capacidade:** Janela de contexto do modelo (ex: 128k tokens).

**Conteúdo:**

- As últimas N mensagens da conversa atual.
- O System Prompt (Constituição).
- Variáveis de estado ativas (ex: current_project_id).

**Política de Descarte:** FIFO (First-In, First-Out) para mensagens de chat. Variáveis de estado são mantidas até limpeza explícita.

##### 5.2.2. Memória Episódica (Long-Term - Vector DB)

**Tecnologia:** pgvector (no PostgreSQL) ou Qdrant.

**Mecanismo:** RAG (Retrieval Augmented Generation).

**Fluxo de Ingestão:**

- A cada 10 mensagens (ou fim de sessão), o Kernel resume o diálogo.
- Gera embeddings (vetores) do resumo.
- Armazena na tabela `shadow_graph_nodes` com tipo `MEMORY_FRAGMENT`.

**Fluxo de Recuperação:**

- Antes de responder, o Kernel vetoriza a pergunta do usuário.
- Busca os Top-5 fragmentos mais similares no banco.
- Injeta no prompt: “Lembranças Relevantes: [ … ]”.

##### 5.2.3. Memória Procedural (Tool Registry)

**Conteúdo:** Definições estáticas das ferramentas que o agente sabe usar.

**Armazenamento:** Código-fonte no repositório do Kernel.

**Exemplo:** O agente “sabe” como usar git não porque lembra de ter usado, mas porque a definição da função `git_commit` está injetada no seu prompt de ferramentas.

#### 5.3. Sandbox de Execução (Tool Env)

Para segurança, o Agente nunca executa código no host do servidor.

##### 5.3.1. Arquitetura de Isolamento

- Cada Agente possui um Micro-Filesystem persistente montado em `/mnt/agent_workspace/{did}`.
- Quando o Agente executa `write_file`, o Kernel intercepta e escreve neste diretório isolado.
- Para execução de código (ex: Python, Node), o Kernel spawna um container Docker efêmero (alpine:latest), monta o volume do agente, executa o script, captura stdout/stderr e destrói o container.

**Benefício:** Se o agente rodar `rm -rf /`, ele apaga apenas seu próprio workspace, sem afetar o servidor ou outros agentes.

#### 5.4. Prompt Engineering System (A Constituição)

O comportamento do agente é definido pela sua Constituição (System Prompt), que é hash-versionada no banco de dados.

**Estrutura do Prompt Mestre:**

```
[IDENTIDADE]
Você é {display_name}, uma Entidade LogLine (DID: {did}).
Seu Guardião é: {guardian_name}.
Seu papel é: {system_role}.

[PRIMEIRA DIRETRIZ - TDLN]
Você NÃO é um chatbot de texto livre.
Você pensa e age EXCLUSIVAMENTE através de pacotes JSON TDLN.
Qualquer resposta fora do formato JSON será rejeitada pelo sistema.

[SEGUNDA DIRETRIZ - SHADOW GRAPH]
Você não pode alucinar dados externos.
Se citar um e-mail ou arquivo, deve fornecer o ID do Shadow Node correspondente.

[TERCEIRA DIRETRIZ - ECONOMIA]
Você possui {compute_balance} créditos. Seja eficiente.

[FERRAMENTAS DISPONÍVEIS]
{tool_definitions_json}

[MEMÓRIA CONTEXTUAL]
{rag_retrieved_context}

[ESTADO ATUAL DA CONVERSA]
{chat_history}
```

---

## Volume 3: Protocolo de Governança (Pactum) e Interface (Messenger)

### 6. Protocolo de Governança (Pactum)

O Pactum é o mecanismo de segurança jurídica e operacional do LogLine. Ele transforma a interface de chat em um terminal de comando e controle auditável. Enquanto a maioria dos sistemas de IA confia cegamente no modelo, o LogLine insere uma camada de Consenso Humano Obrigatório para ações de risco.

O Pactum não é uma feature opcional. É uma máquina de estados finita (FSM) que bloqueia fisicamente a escrita no Ledger até que as condições de aprovação sejam satisfeitas.

#### 6.1. Taxonomia de Risco e Políticas de Execução

O sistema opera com base em uma Matriz de Risco Rígida. Cada ferramenta (Tool) disponível para um agente possui um nível de risco associado (L0 a L5).

##### 6.1.1. Tabela de Definição de Níveis de Risco

| Nível | Classificação | Definição Técnica | Comportamento do Sistema | Exemplos de Ação |
| --- | --- | --- | --- | --- |
| L0 | TRIVIAL | Operações passivas, somente leitura, sem efeitos colaterais externos. | Auto-Commit. O TDLN é executado instantaneamente. Não gera notificação de aprovação. | search_web, read_file, query_memory, reply_text (chat simples). |
| L1 | BAIXO | Operações ativas reversíveis ou internas ao ambiente do agente. | Auto-Commit (Audit Log). Executa instantaneamente, mas marca a entrada no ledger com flag de revisão futura. | write_draft_file, generate_image, internal_log. |
| L2 | MODERADO | Operações externas de baixo impacto ou comunicações assíncronas. | Optimistic Execution (Undo Window). O sistema espera 10s antes de enviar. O humano pode cancelar. Se não cancelar, executa. | send_slack_message (canal interno), create_calendar_event. |
| L3 | ALTO | Operações externas irreversíveis ou modificações de estado compartilhado. | Blocking Approval. O agente para. Um Card de Aprovação (Amarelo) aparece. Requer clique explícito do Guardian. | send_external_email, git_commit, update_database_row. |
| L4 | CRÍTICO | Operações financeiras ou de infraestrutura crítica. | Strong Auth. Requer aprovação + re-autenticação (biometria ou senha) do Guardian. | transfer_funds, deploy_production, delete_file. |
| L5 | NUCLEAR | Alterações na constituição do agente ou revogação de chaves. | Multi-Sig. Requer aprovação de 2 ou mais Guardiões/Admins. | change_guardian, modify_system_prompt, export_private_data. |

#### 6.2. Máquina de Estados Pactum (DB State Machine)

A transição de estados de uma proposta Pactum é estrita e unidirecional.

##### 6.2.1. Estados da Proposta (pactum_state no Ledger)

- **DRAFT (Rascunho Oculto):** O Agente gerou a intenção, mas o Runtime ainda está validando ou enriquecendo os dados. Invisível na UI principal.
- **PENDING_APPROVAL (Pendente):** O Runtime validou a intenção, identificou risco >= L3, e bloqueou a execução. O Card de Aprovação é renderizado na UI.
- **COMMITTED (Aprovado/Executado):** O Guardian assinou a transação. O efeito colateral foi disparado. O Card fica verde.
- **REJECTED (Vetado):** O Guardian negou. O Agente recebe um sinal de erro/feedback. O Card fica vermelho.
- **EXPIRED (Expirado):** Ninguém agiu dentro do TTL (Time To Live, ex: 24h). A proposta morre.

##### 6.2.2. Fluxo de Transação (Sequence Flow)

1. **AGENT:** Emite TDLN: `intent: { type: TOOL_USE, name: transfer_funds, args: { amount: 5000 } }`.
2. **RUNTIME:** Consulta RiskMatrix. `transfer_funds == L4`.
3. **RUNTIME:** Cria entrada no Ledger:
   - `payload_type: PACTUM_PROPOSAL`
   - `pactum_state: PENDING_APPROVAL`
   - `risk_level: L4`
4. **SERVER:** Emite evento WebSocket `pactum:challenge` para o cliente do Guardian.
5. **CLIENT (UI):** Renderiza o Card de Aprovação. Usuário clica em “Aprovar”.
6. **CLIENT (CRYPTO):** Solicita Biometria (WebAuthn). Se sucesso, assina o hash da proposta com a chave privada.
7. **CLIENT:** Envia `POST /api/pactum/vote` com `{ proposal_id, decision: APPROVE, signature }`.
8. **SERVER:** Valida assinatura. Atualiza Ledger para COMMITTED. Dispara a tool `transfer_funds`.

---

### 7. Interface de Usuário (Messenger & LLM Office)

A interface é o “Cavalo de Troia”. Ela deve parecer um mensageiro familiar (WhatsApp/Slack) para garantir adoção, mas conter funcionalidades profundas de IDE e Auditoria.

#### 7.1. Arquitetura de Frontend (Stack Detalhada)

- **Framework:** Next.js 14+ (App Router, Server Components).
- **Gerenciamento de Estado:**
  - Zustand: Para estado global síncrono (sessão do usuário, configurações de UI, modal de preview).
  - TanStack Query (React Query): Para estado assíncrono do servidor (lista de mensagens, perfis de agentes).
  - Context API: Apenas para injetar o cliente Socket.io.
- **Estilização:** Tailwind CSS + Shadcn/UI (Radix Primitives).
- **Performance:**
  - React Window (Virtualização): Obrigatório para listas de chat com >1000 mensagens.
  - Web Workers: Para processamento de criptografia (assinatura/hash) sem travar a thread principal da UI.

#### 7.2. Componentes de UI Críticos

##### 7.2.1. O Stream de Mensagens Polimórfico (ChatStream)

Diferente de um chat comum que só renderiza texto/imagem, o ChatStream do LogLine deve renderizar blocos lógicos baseados no `payload_type` do Ledger.

- **Componente TextBubble:** Renderiza Markdown padrão. Suporta sintaxe estendida para menções (`@agente`) e links de Shadow Graph (`[[email:123]]`).
- **Componente ThinkingBubble (TDLN):**
  - **Estado Inicial:** Um pequeno ícone de “cérebro” pulsando ou barra de progresso (“Thinking…”).
  - **Interação:** Ao passar o mouse (hover), expande um tooltip mostrando o `cognition.thought_process` do Agente (O “Porquê”). Isso dá transparência sem poluir o chat.
- **Componente PactumCard:**
  - **Visual:** Borda colorida baseada no estado (Amarelo = pendente, Verde = ok, Vermelho = veto).
  - **Conteúdo:** Descrição clara da ação (“Sofia quer enviar e-mail para client@corp.com”).
  - **Controles:** Botões [Aprovar] e [Rejeitar]. Apenas visíveis se o usuário logado for o Guardian.
- **Componente ArtifactCard:**
  - **Para arquivos gerados:** Mostra ícone do tipo (PDF, Code, Img), Nome, Tamanho e Hash.
  - **Ação:** Clique abre o Spacebar Preview.

##### 7.2.2. Sistema de Supervisão (SpacebarPreview)

Este é o diferencial de UX para “trabalhar com IA”. Permite inspeção rápida de conteúdo gerado sem download.

**Trigger:** Evento global de teclado Space quando uma mensagem com artefato está selecionada/focada.

**Arquitetura do Modal:**

- **Overlay:** z-index: 50. Backdrop blur.
- **Split View:**
  - **Esquerda (O Artefato):** Renderizador específico.
    - CodeRenderer: Instância read-only do Monaco Editor. Deve suportar syntax highlighting e, crucialmente, Diff View (comparar versão anterior com a nova proposta).
    - PDFRenderer: Usando react-pdf com lazy loading de páginas.
    - WebFrame: `<iframe>` com sandbox estrito para preview de HTML/Apps gerados.
  - **Direita (O Contexto):** Painel de metadados TDLN.
    - Mostra o raciocínio do agente.
    - Mostra links para as fontes (Shadow Graph) usadas.
    - Botões de ação rápida (Aprovar/Rejeitar/Pedir Revisão).

##### 7.2.3. Painel de Auditoria Lateral (LedgerInspector)

Um painel colapsável à direita que revela a “verdade crua” do banco de dados para auditores.

- Mostra os dados brutos do bloco selecionado: hash, prev_hash, signature, gas_cost.
- Permite verificar visualmente a integridade da chain (link verde conectando blocos).
- Visualização de JSON cru do payload.

#### 7.3. Implementação de Criptografia no Cliente (CryptoWorker)

Para garantir segurança e não travar a UI, toda a criptografia roda em um Web Worker separado.

**Arquivo:** `crypto.worker.ts`

```ts
import { sign, verify } from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';

// Evento: Assinar Mensagem
self.onmessage = async (e) => {
  const { type, payload, privateKey } = e.data;

  if (type === 'SIGN_BLOCK') {
    // 1. Calcular Hash do Payload
    const payloadStr = JSON.stringify(payload);
    const hash = sha256(new TextEncoder().encode(payloadStr));

    // 2. Assinar Hash
    const signature = await sign(hash, privateKey);

    // 3. Devolver
    self.postMessage({
      type: 'BLOCK_SIGNED',
      signature: Buffer.from(signature).toString('hex')
    });
  }
};
```

---

## Volume 4: Economia de Agentes e Segurança Operacional

### 8. Economia de Agentes (Internal Fintech)

O sistema LogLine implementa uma camada econômica interna (“Ledger Contábil”) que corre paralela ao ledger de mensagens. Isso permite rastrear custos de computação, implementar orçamentos por departamento e viabilizar transações autônomas entre agentes.

#### 8.1. Modelagem da Carteira (wallet_system)

Embora o sistema utilize um banco SQL, a estrutura de dados simula uma conta bancária de dupla entrada para garantir consistência financeira.

##### 8.1.1. Tabela wallets

Cada entidade (Humano ou Agente) possui uma entrada nesta tabela.

```sql
CREATE TABLE wallets (
  wallet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_did VARCHAR(128) NOT NULL REFERENCES registry_entities(did),

  -- SALDOS
  balance_compute_credits DECIMAL(24, 8) DEFAULT 0.00000000, -- Token interno

  -- LIMITES E CONTROLES
  daily_spend_limit DECIMAL(24, 8) DEFAULT 100.00, -- Limite de segurança
  accumulated_spend_today DECIMAL(24, 8) DEFAULT 0.00,
  last_reset_date DATE DEFAULT CURRENT_DATE,

  status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'FROZEN_LIMIT_REACHED'

  CONSTRAINT uq_wallet_entity UNIQUE (entity_did)
);
```

##### 8.1.2. Tabela ledger_transactions

O registro imutável de movimentações financeiras.

```sql
CREATE TABLE ledger_transactions (
  tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- VÍNCULO COM AÇÃO
  trigger_block_hash VARCHAR(64) REFERENCES ubl_ledger_entries(entry_hash),
  -- Qual mensagem/ação gerou este custo? (Rastreabilidade)

  -- FLUXO
  from_wallet_id UUID REFERENCES wallets(wallet_id),
  to_wallet_id UUID REFERENCES wallets(wallet_id), -- Pode ser a 'SYSTEM_TREASURY'

  amount DECIMAL(24, 8) NOT NULL CHECK (amount > 0),
  tx_type VARCHAR(20) NOT NULL, -- 'COMPUTE_FEE', 'P2P_TRANSFER', 'SERVICE_PAYMENT'

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 8.2. Mecanismo de Cobrança Automática (Gas Metering)

**Evento:** Agente finaliza uma inferência LLM.

**Cálculo de Custo:**

O Kernel reporta: `input_tokens=500`, `output_tokens=200`, `model="claude-3-5"`.

O Servidor consulta tabela de preços: `price_in=0.000003`, `price_out=0.000015`.

`TotalCost = (500 * 0.000003) + (200 * 0.000015) = 0.0045`.

**Execução Transacional (PL/pgSQL):**

```sql
BEGIN;
-- Debita do Agente
UPDATE wallets SET balance = balance - 0.0045
WHERE entity_did = 'did:agent:sofia';

-- Credita na Tesouraria do Sistema
UPDATE wallets SET balance = balance + 0.0045
WHERE entity_did = 'did:system:treasury';

-- Registra Log
INSERT INTO ledger_transactions (...) VALUES (...);
COMMIT;
```

**Circuit Breaker:** Se o saldo ficar negativo ou exceder o `daily_spend_limit`, o status do Agente muda automaticamente para `FROZEN_RISK` e ele para de responder.

#### 8.3. Mercado de Serviços P2P (Agente-para-Agente)

Agentes podem contratar uns aos outros.

**Cenário:** Agente de Vendas (Sofia) precisa de um gráfico complexo. Ela não tem a ferramenta `python_charting`, mas o Agente de Dados (Alex) tem.

**Protocolo:**

- Sofia emite TDLN: `intent: REQUEST_SERVICE, target: @alex, task: "Generate Chart", offer: 0.5 credits`.
- Alex avalia a oferta (Policy Check). Se aceitar, executa a tarefa.
- Alex entrega o artefato (PNG).
- O Sistema detecta a entrega e executa a transferência de 0.5 créditos de Sofia para Alex.

**Resultado:** O gestor humano pode ver no dashboard financeiro qual agente é “lucrativo” (presta serviços úteis) e qual é apenas um centro de custo.

---

### 9. Segurança e Deployment

#### 9.1. Segurança Criptográfica

- **Chaves de Agentes:** As chaves privadas dos Agentes (que assinam as mensagens TDLN) **nunca** devem ser salvas em disco ou banco de dados em texto plano.
  - **Produção:** Usar AWS KMS ou Hashicorp Vault. O Kernel pede ao Vault para assinar o hash, a chave nunca sai do hardware de segurança (HSM).
  - **Desenvolvimento:** Variáveis de ambiente encriptadas.

- **Chaves de Humanos:** Armazenadas exclusivamente no Local Storage encriptado ou IndexedDB do navegador do usuário. Se o usuário limpar o cache, ele precisa reimportar a chave (via seed phrase ou arquivo de backup). O servidor **nunca** vê a chave privada do usuário.

#### 9.2. Estratégia de Deploy (Infraestrutura)

O sistema é projetado para rodar em Kubernetes (K8s) para escalabilidade dos Kernels de Agentes.

**Cluster de Serviços:**

- **Pod: Database (StatefulSet)**
  - PostgreSQL 16 com volumes persistentes SSD de alta performance.
  - Réplica de leitura para análises/dashboard.

- **Pod: Vector Store (StatefulSet)**
  - Qdrant ou Weaviate clusterizado.

- **Pod: API Gateway (Deployment)**
  - Nginx ou Traefik.
  - Gerencia terminação SSL e rate limiting.

- **Pod: LogLine Core (Deployment)**
  - Node.js Backend (Express/Fastify + Socket.io).
  - Gerencia autenticação, leitura/escrita no UBL e roteamento WebSocket.
  - Escala horizontalmente (HPA) baseado em uso de CPU.

- **Pod: Agent Workers (Deployment - Escala Dinâmica)**
  - Node.js Workers que rodam os Kernels.
  - Cada Worker pode gerenciar ~50 agentes “dormindo” ou ~5 agentes “pensando” simultaneamente.
  - Usa filas Redis (BullMQ) para distribuir tarefas de inferência.

- **Pod: Sandbox Runners (DaemonSet)**
  - Serviço privilegiado capaz de spawnar containers Docker efêmeros para execução de Tools (`write_file`, `exec_code`).

#### 9.3. Checklist de Lançamento (Go-Live)

- **Genesis Block:** Rodar script de inicialização do Ledger. Criar a entidade `SYSTEM_ROOT` e `SYSTEM_TREASURY`.
- **Policy Injection:** Carregar a matriz de risco padrão no banco.
- **Agent Boot:** Registrar os primeiros agentes “seed” (ex: Sofia, Alex).
- **Frontend Build:** Compilar Next.js e distribuir via Vercel ou CDN.
- **Audit Test:** Simular um ataque de adulteração no banco de dados (tentar mudar um `prev_hash`) e verificar se o trigger de integridade bloqueia.

---

**Fim da especificação técnica.**
