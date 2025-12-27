const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { z } = require('zod');
const { config } = require('./config');
const { createChallenge, verifyChallenge } = require('./auth');
const { getLatestLedgerHash, insertLedgerEntry } = require('./ledger');

const app = express();
app.use(express.json({ limit: '1mb' }));

app.post('/api/v1/auth/challenge', createChallenge);
app.post('/api/v1/auth/verify', verifyChallenge);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const ublStream = io.of('/ubl-stream');

const ledgerEntrySchema = z.object({
  prev_hash: z.string().min(1),
  sender_did: z.string().min(1),
  target_did: z.string().nullable().optional(),
  group_id: z.string().uuid().nullable().optional(),
  payload: z.record(z.any()),
  payload_type: z.string().min(1),
  pactum_state: z.string().optional(),
  risk_level: z.string().optional(),
  gas_cost: z.number().nullable().optional(),
  token_usage: z.number().int().nullable().optional(),
  signature: z.string().min(1),
  client_timestamp: z.string().min(1),
});

ublStream.on('connection', (socket) => {
  socket.on('ledger:append', async (payload, callback) => {
    try {
      const parsed = ledgerEntrySchema.safeParse(payload);
      if (!parsed.success) {
        if (typeof callback === 'function') {
          callback({
            status: 'rejected',
            error: 'INVALID_PAYLOAD',
            detail: parsed.error.flatten(),
          });
        }
        return;
      }

      const entry = await insertLedgerEntry(parsed.data);
      ublStream.emit('ledger:committed', {
        entry_hash: entry.entry_hash,
        sequence_id: entry.sequence_id,
        server_timestamp: entry.server_timestamp,
      });

      if (typeof callback === 'function') {
        callback({ status: 'committed' });
      }
    } catch (error) {
      const latestHash = await getLatestLedgerHash();
      if (typeof callback === 'function') {
        callback({
          status: 'rejected',
          error: error.code ?? 'LEDGER_REJECTED',
          latest_hash: error.latest_hash ?? latestHash,
          detail: error.message ?? 'unknown_error',
        });
      }
    }
  });

  socket.on('agent:status', (payload) => {
    ublStream.emit('agent:status', payload);
  });
});

server.listen(config.port, () => {
  console.log(`LogLine Core listening on port ${config.port}`);
});
