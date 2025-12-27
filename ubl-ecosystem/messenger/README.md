# UBL Messenger

A messaging system that uses OFFICE for LLM-powered smart features and UBL for immutable message storage.

## Features

### Basic Messaging
- Send/receive messages (text, attachments)
- Read receipts
- Message reactions
- Thread replies
- Message editing (with history in ledger)
- Message deletion (soft delete, preserved in ledger)

### Conversations
- 1:1 conversations
- Group conversations (N participants)
- Conversation metadata (name, avatar, settings)
- Participant management (add, remove, permissions)
- Conversation muting/archiving

### LLM Participants
- Add LLM entities to conversations
- LLM responds automatically or on demand
- Configure LLM behavior via constitution
- Different personas per conversation

### Smart Features (via OFFICE)
- Thread summarization
- Sentiment analysis
- Reply suggestions
- Action item extraction

### Security & Audit
- Cryptographic hashes for all messages
- Audit trail in UBL ledger
- Read receipts stored immutably

## API Endpoints

### Conversations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/conversations` | POST | Create conversation |
| `/conversations` | GET | List conversations |
| `/conversations/:id` | GET | Get conversation |
| `/conversations/:id` | PATCH | Update conversation |
| `/conversations/:id` | DELETE | Delete conversation |
| `/conversations/:id/participants` | POST | Add participant |
| `/conversations/:id/participants/:pid` | DELETE | Remove participant |

### Messages

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/conversations/:id/messages` | POST | Send message |
| `/conversations/:id/messages` | GET | Get messages |
| `/conversations/:id/messages/:mid` | PATCH | Edit message |
| `/conversations/:id/messages/:mid` | DELETE | Delete message |
| `/conversations/:id/messages/:mid/reactions` | POST | Add reaction |
| `/conversations/:id/messages/:mid/read` | GET | Mark as read |

### LLM Integration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/conversations/:id/llm` | POST | Add LLM participant |
| `/conversations/:id/llm/:lid` | PATCH | Update LLM config |

### Smart Features

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/conversations/:id/summarize` | POST | Summarize conversation |
| `/conversations/:id/extract-actions` | POST | Extract action items |

### Ledger

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ledger/logs` | GET | Get ledger transaction logs |

## Running

```bash
# Development
cargo run

# Production
MESSENGER__OFFICE__ENDPOINT=http://office:8080 cargo run --release
```

## Configuration

```toml
[server]
host = "0.0.0.0"
port = 8081

[office]
endpoint = "http://localhost:8080"
timeout_ms = 30000

[ubl]
endpoint = "http://localhost:3000"
container_id = "messenger"
```

## Integration

### With OFFICE
- LLM entities are created via OFFICE API
- Sessions are managed for each interaction
- Smart features use OFFICE's LLM capabilities

### With UBL
- All messages stored as events in ledger
- Read receipts stored as events
- Full audit trail available

## License

MIT
