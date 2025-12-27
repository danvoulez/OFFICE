//! Messenger UBL Client
//!
//! Client for storing messages and events in the UBL ledger.

use std::time::Duration;

use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::message::Message;
use crate::{MessengerError, Result};

/// UBL client for messenger
pub struct MessengerUblClient {
    endpoint: String,
    container_id: String,
    client: Client,
}

impl MessengerUblClient {
    pub fn new(endpoint: &str, container_id: &str) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            endpoint: endpoint.to_string(),
            container_id: container_id.to_string(),
            client,
        }
    }

    /// Get current ledger state
    pub async fn get_state(&self) -> Result<LedgerState> {
        let url = format!("{}/state/{}", self.endpoint, self.container_id);

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| MessengerError::UblError(e.to_string()))?;

        if !resp.status().is_success() {
            return Ok(LedgerState::default());
        }

        resp.json().await
            .map_err(|e| MessengerError::UblError(e.to_string()))
    }

    /// Store a message event in the ledger
    pub async fn store_message(&self, message: &Message) -> Result<String> {
        let state = self.get_state().await?;

        let event = MessageEvent {
            event_type: "message.created".to_string(),
            message_id: message.id.clone(),
            conversation_id: message.conversation_id.clone(),
            from: message.from.clone(),
            content_hash: message.hash.clone(),
            timestamp: message.timestamp,
        };

        let atom = serde_json::to_value(&event)
            .map_err(|e| MessengerError::UblError(e.to_string()))?;

        let atom_hash = self.hash_atom(&atom);

        let link = LinkCommit {
            version: 1,
            container_id: self.container_id.clone(),
            expected_sequence: state.sequence + 1,
            previous_hash: state.last_hash,
            atom_hash: atom_hash.clone(),
            intent_class: "Observation".to_string(),
            physics_delta: 0,
            pact: None,
            author_pubkey: "messenger".to_string(), // In production, use real key
            signature: "mock_signature".to_string(), // In production, sign properly
        };

        let url = format!("{}/link/commit", self.endpoint);

        let resp = self.client.post(&url)
            .json(&link)
            .send()
            .await
            .map_err(|e| MessengerError::UblError(e.to_string()))?;

        if !resp.status().is_success() {
            // Log but don't fail - UBL is optional
            tracing::warn!("Failed to store message in UBL: {}", resp.status());
            return Ok(atom_hash);
        }

        let commit_resp: CommitResponse = resp.json().await
            .map_err(|e| MessengerError::UblError(e.to_string()))?;

        Ok(commit_resp.entry_hash)
    }

    /// Store a read receipt
    pub async fn store_read_receipt(&self, message_id: &str, user_id: &str) -> Result<()> {
        let state = self.get_state().await?;

        let event = ReadReceiptEvent {
            event_type: "message.read".to_string(),
            message_id: message_id.to_string(),
            user_id: user_id.to_string(),
            timestamp: Utc::now(),
        };

        let atom = serde_json::to_value(&event)
            .map_err(|e| MessengerError::UblError(e.to_string()))?;

        let atom_hash = self.hash_atom(&atom);

        let link = LinkCommit {
            version: 1,
            container_id: self.container_id.clone(),
            expected_sequence: state.sequence + 1,
            previous_hash: state.last_hash,
            atom_hash,
            intent_class: "Observation".to_string(),
            physics_delta: 0,
            pact: None,
            author_pubkey: user_id.to_string(),
            signature: "mock_signature".to_string(),
        };

        let url = format!("{}/link/commit", self.endpoint);
        let _ = self.client.post(&url).json(&link).send().await;

        Ok(())
    }

    /// Get ledger logs
    pub async fn get_logs(&self, limit: usize) -> Result<Vec<LedgerLog>> {
        let url = format!(
            "{}/ledger/{}/events?limit={}",
            self.endpoint, self.container_id, limit
        );

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| MessengerError::UblError(e.to_string()))?;

        if !resp.status().is_success() {
            return Ok(vec![]);
        }

        resp.json().await
            .map_err(|e| MessengerError::UblError(e.to_string()))
    }

    /// Hash an atom (simplified)
    fn hash_atom(&self, atom: &serde_json::Value) -> String {
        use sha2::{Sha256, Digest};
        let canonical = serde_json::to_string(atom).unwrap_or_default();
        let mut hasher = Sha256::new();
        hasher.update(canonical.as_bytes());
        hex::encode(hasher.finalize())
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LedgerState {
    pub container_id: String,
    pub sequence: u64,
    pub last_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MessageEvent {
    event_type: String,
    message_id: String,
    conversation_id: String,
    from: String,
    content_hash: String,
    timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ReadReceiptEvent {
    event_type: String,
    message_id: String,
    user_id: String,
    timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LinkCommit {
    version: u8,
    container_id: String,
    expected_sequence: u64,
    previous_hash: String,
    atom_hash: String,
    intent_class: String,
    physics_delta: i64,
    pact: Option<serde_json::Value>,
    author_pubkey: String,
    signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CommitResponse {
    ok: bool,
    entry_hash: String,
    sequence: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerLog {
    pub entry_hash: String,
    pub sequence: u64,
    pub timestamp: DateTime<Utc>,
    pub event_type: String,
}
