-- LogLine Foundation: Initial schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

SET timezone = 'UTC';

-- Enumerations
DO $$ BEGIN
  CREATE TYPE entity_substrate_type AS ENUM ('BIO', 'SILICON', 'CORP', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE entity_status_type AS ENUM ('BOOTSTRAPPING', 'ACTIVE', 'PAUSED', 'FROZEN_RISK', 'DECOMMISSIONED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ledger_payload_type AS ENUM ('TEXT', 'TDLN_PACKET', 'PACTUM_VOTE', 'SYSTEM_LOG', 'FILE_REF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pactum_state_type AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'COMMITTED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Registry entities
CREATE TABLE registry_entities (
  -- Identity
  did VARCHAR(128) PRIMARY KEY,
  public_key TEXT NOT NULL,
  substrate entity_substrate_type NOT NULL,

  -- Profile
  display_name VARCHAR(255) NOT NULL,
  handle VARCHAR(64) NOT NULL,
  avatar_url TEXT,
  bio_description TEXT,

  -- Guardianship & responsibility
  guardian_did VARCHAR(128),
  guardian_contract_signature TEXT,

  -- Economy
  wallet_address VARCHAR(42),
  compute_credits DECIMAL(24, 18) DEFAULT 0.000000000000000000,
  daily_spend_limit DECIMAL(24, 18),

  -- Agent state
  system_role VARCHAR(50) DEFAULT 'MEMBER',
  status entity_status_type DEFAULT 'ACTIVE',
  constitution_hash VARCHAR(64),
  memory_root VARCHAR(64),
  base_model_id VARCHAR(100),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT uq_entities_handle UNIQUE (handle),
  CONSTRAINT uq_entities_wallet UNIQUE (wallet_address),
  CONSTRAINT fk_entities_guardian FOREIGN KEY (guardian_did) REFERENCES registry_entities(did) ON DELETE RESTRICT
);

CREATE INDEX idx_registry_handle ON registry_entities(handle);
CREATE INDEX idx_registry_guardian ON registry_entities(guardian_did);
CREATE INDEX idx_registry_status ON registry_entities(status) WHERE status = 'ACTIVE';

-- Ledger entries
CREATE TABLE ubl_ledger_entries (
  -- Block identity
  entry_hash VARCHAR(64) PRIMARY KEY,
  prev_hash VARCHAR(64) NOT NULL,
  sequence_id BIGSERIAL NOT NULL UNIQUE,

  -- Routing
  sender_did VARCHAR(128) NOT NULL,
  target_did VARCHAR(128),
  group_id UUID,

  -- Content
  payload JSONB NOT NULL,
  payload_type ledger_payload_type NOT NULL,

  -- Consensus state
  pactum_state pactum_state_type DEFAULT 'COMMITTED',
  risk_level VARCHAR(10) DEFAULT 'L0',

  -- Costs & metadata
  gas_cost DECIMAL(18, 8),
  token_usage INT,

  -- Security
  signature VARCHAR(512) NOT NULL,
  client_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Relationships
  CONSTRAINT fk_ledger_sender FOREIGN KEY (sender_did) REFERENCES registry_entities(did)
);

CREATE INDEX idx_ledger_p2p ON ubl_ledger_entries(sender_did, target_did);
CREATE INDEX idx_ledger_group ON ubl_ledger_entries(group_id, sequence_id DESC);
CREATE INDEX idx_ledger_payload ON ubl_ledger_entries USING GIN (payload);

-- Shadow graph
CREATE TABLE shadow_graph_nodes (
  node_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Source metadata
  source_platform VARCHAR(50) NOT NULL,
  external_id VARCHAR(255) NOT NULL,

  -- Content integrity
  content_snapshot TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,

  -- AI memory
  embedding_vector vector(1536),

  -- System linkage
  ingested_by_did VARCHAR(128) REFERENCES registry_entities(did),
  ledger_entry_ref VARCHAR(64) REFERENCES ubl_ledger_entries(entry_hash),

  -- Processing state
  process_status VARCHAR(20) DEFAULT 'RAW',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shadow_embedding ON shadow_graph_nodes
USING hnsw (embedding_vector vector_cosine_ops);

-- Wallet system
CREATE TABLE wallets (
  wallet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_did VARCHAR(128) NOT NULL REFERENCES registry_entities(did),

  -- Balances
  balance_compute_credits DECIMAL(24, 8) DEFAULT 0.00000000,

  -- Limits & controls
  daily_spend_limit DECIMAL(24, 8) DEFAULT 100.00,
  accumulated_spend_today DECIMAL(24, 8) DEFAULT 0.00,
  last_reset_date DATE DEFAULT CURRENT_DATE,

  status VARCHAR(20) DEFAULT 'ACTIVE',

  CONSTRAINT uq_wallet_entity UNIQUE (entity_did)
);

CREATE TABLE ledger_transactions (
  tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to action
  trigger_block_hash VARCHAR(64) REFERENCES ubl_ledger_entries(entry_hash),

  -- Flow
  from_wallet_id UUID REFERENCES wallets(wallet_id),
  to_wallet_id UUID REFERENCES wallets(wallet_id),

  amount DECIMAL(24, 8) NOT NULL CHECK (amount > 0),
  tx_type VARCHAR(20) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers
CREATE OR REPLACE FUNCTION func_protect_entity_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.did != OLD.did THEN
    RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: Entity DID is immutable.';
  END IF;

  IF NEW.substrate != OLD.substrate THEN
    RAISE EXCEPTION 'ONTOLOGY VIOLATION: Entity substrate cannot be changed once instantiated.';
  END IF;

  NEW.updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entity_immutability
BEFORE UPDATE ON registry_entities
FOR EACH ROW EXECUTE FUNCTION func_protect_entity_immutability();

CREATE OR REPLACE FUNCTION func_enforce_guardianship()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.substrate = 'SILICON' THEN
    IF NEW.guardian_did IS NULL THEN
      RAISE EXCEPTION 'LEGAL VIOLATION: Silicon Agents must have a defined Guardian DID.';
    END IF;

    IF NEW.guardian_contract_signature IS NULL THEN
      RAISE EXCEPTION 'LEGAL VIOLATION: Silicon Agents must have a signed liability contract.';
    END IF;
  END IF;

  IF NEW.guardian_did = NEW.did THEN
    RAISE EXCEPTION 'LOGIC VIOLATION: Entity cannot be its own Guardian.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entity_guardianship
BEFORE INSERT OR UPDATE ON registry_entities
FOR EACH ROW EXECUTE FUNCTION func_enforce_guardianship();

CREATE OR REPLACE FUNCTION func_ubl_chain_guard()
RETURNS TRIGGER AS $$
DECLARE
  last_stored_hash VARCHAR(64);
  computed_hash VARCHAR(64);
  payload_string TEXT;
BEGIN
  SELECT entry_hash INTO last_stored_hash
  FROM ubl_ledger_entries
  ORDER BY sequence_id DESC
  LIMIT 1;

  IF last_stored_hash IS NULL THEN
    IF NEW.prev_hash != '0000000000000000000000000000000000000000000000000000000000000000' THEN
      RAISE EXCEPTION 'LEDGER INTEGRITY: First block must have zeroed prev_hash.';
    END IF;
  ELSE
    IF NEW.prev_hash != last_stored_hash THEN
      RAISE EXCEPTION 'LEDGER INTEGRITY: Chain Broken. Expected prev_hash %, got %', last_stored_hash, NEW.prev_hash;
    END IF;
  END IF;

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
