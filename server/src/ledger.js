const crypto = require('crypto');
const stableStringify = require('json-stable-stringify');
const { query } = require('./db');

const ZERO_HASH = '0'.repeat(64);

function toCanonicalPayload(payload) {
  return stableStringify(payload ?? {});
}

function computeEntryHash({ prev_hash, sender_did, payload, client_timestamp }) {
  const payloadString = toCanonicalPayload(payload);
  return crypto
    .createHash('sha256')
    .update(`${prev_hash}${sender_did}${payloadString}${client_timestamp}`)
    .digest('hex');
}

async function getLatestLedgerHash() {
  const result = await query(
    'SELECT entry_hash FROM ubl_ledger_entries ORDER BY sequence_id DESC LIMIT 1'
  );
  return result.rows[0]?.entry_hash ?? null;
}

async function insertLedgerEntry(entry) {
  const {
    prev_hash,
    sender_did,
    target_did,
    group_id,
    payload,
    payload_type,
    pactum_state,
    risk_level,
    gas_cost,
    token_usage,
    client_timestamp,
    signature,
  } = entry;

  const expectedPrevHash = (await getLatestLedgerHash()) ?? ZERO_HASH;
  if (prev_hash !== expectedPrevHash) {
    const error = new Error('CHAIN_REORG_REQUIRED');
    error.code = 'CHAIN_REORG_REQUIRED';
    error.latest_hash = expectedPrevHash;
    throw error;
  }

  const entry_hash = computeEntryHash({
    prev_hash,
    sender_did,
    payload,
    client_timestamp,
  });

  const result = await query(
    `INSERT INTO ubl_ledger_entries (
      entry_hash,
      prev_hash,
      sender_did,
      target_did,
      group_id,
      payload,
      payload_type,
      pactum_state,
      risk_level,
      gas_cost,
      token_usage,
      signature,
      client_timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING entry_hash, sequence_id, server_timestamp`,
    [
      entry_hash,
      prev_hash,
      sender_did,
      target_did ?? null,
      group_id ?? null,
      payload,
      payload_type,
      pactum_state ?? 'COMMITTED',
      risk_level ?? 'L0',
      gas_cost ?? null,
      token_usage ?? null,
      signature,
      client_timestamp,
    ]
  );

  return result.rows[0];
}

module.exports = { getLatestLedgerHash, insertLedgerEntry };
