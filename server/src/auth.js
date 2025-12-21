const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nacl = require('tweetnacl');
const { query } = require('./db');
const { config } = require('./config');

const activeChallenges = new Map();

async function createChallenge(req, res) {
  const { did } = req.body ?? {};
  if (!did) {
    res.status(400).json({ error: 'did_required' });
    return;
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const challenge = {
    nonce,
    difficulty: 1,
    server_ts: Date.now(),
  };

  activeChallenges.set(did, challenge);
  res.json(challenge);
}

async function verifyChallenge(req, res) {
  const { did, nonce, signature, client_pubkey } = req.body ?? {};
  if (!did || !nonce || !signature || !client_pubkey) {
    res.status(400).json({ error: 'invalid_payload' });
    return;
  }

  const expected = activeChallenges.get(did);
  if (!expected || expected.nonce !== nonce) {
    res.status(401).json({ error: 'invalid_challenge' });
    return;
  }

  const entityResult = await query(
    'SELECT public_key FROM registry_entities WHERE did = $1',
    [did]
  );

  const entity = entityResult.rows[0];
  if (!entity) {
    res.status(404).json({ error: 'entity_not_found' });
    return;
  }

  if (client_pubkey !== entity.public_key) {
    res.status(401).json({ error: 'public_key_mismatch' });
    return;
  }

  const message = Buffer.from(nonce, 'utf8');
  const signatureBytes = Buffer.from(signature, 'hex');
  const publicKeyBytes = Buffer.from(client_pubkey, 'hex');

  if (signatureBytes.length !== nacl.sign.signatureLength) {
    res.status(400).json({ error: 'invalid_signature_format' });
    return;
  }

  if (publicKeyBytes.length !== nacl.sign.publicKeyLength) {
    res.status(400).json({ error: 'invalid_public_key_format' });
    return;
  }

  const verified = nacl.sign.detached.verify(
    message,
    signatureBytes,
    publicKeyBytes
  );

  if (!verified) {
    res.status(401).json({ error: 'invalid_signature' });
    return;
  }

  activeChallenges.delete(did);
  res.json({ token: issueToken(did) });
}

function issueToken(did) {
  return jwt.sign({ did }, config.jwtSecret, { expiresIn: '15m' });
}

module.exports = { createChallenge, verifyChallenge, issueToken };
