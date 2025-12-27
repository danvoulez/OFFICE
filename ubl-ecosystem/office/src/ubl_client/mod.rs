//! UBL Client Module
//!
//! HTTP client for interacting with UBL 2.0 ledger.

mod ledger;
mod affordances;
mod receipts;
mod events;
mod trust;

pub use ledger::{LedgerState, LedgerEvent};
pub use affordances::{UblAffordance, UblObligation};
pub use receipts::Receipt;
pub use events::EventStream;
pub use trust::{TrustLevel, PolicyChain};

use std::time::Duration;

use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::entity::EntityId;
use crate::session::Handover;
use crate::{OfficeError, Result};

/// UBL Client for ledger operations
pub struct UblClient {
    endpoint: String,
    container_id: String,
    client: Client,
    timeout: Duration,
}

impl UblClient {
    /// Create a new UBL client
    pub fn new(endpoint: &str, container_id: &str, timeout_ms: u64) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_millis(timeout_ms))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            endpoint: endpoint.to_string(),
            container_id: container_id.to_string(),
            client,
            timeout: Duration::from_millis(timeout_ms),
        }
    }

    /// Health check
    pub async fn health(&self) -> Result<bool> {
        let url = format!("{}/health", self.endpoint);
        match self.client.get(&url).send().await {
            Ok(resp) => Ok(resp.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    /// Get ledger state for an entity
    pub async fn get_state(&self, entity_id: &EntityId) -> Result<LedgerState> {
        let url = format!("{}/state/{}", self.endpoint, entity_id);

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| OfficeError::UblError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            // Return default state for new entities
            return Ok(LedgerState::default());
        }

        resp.json().await
            .map_err(|e| OfficeError::UblError(format!("Parse failed: {}", e)))
    }

    /// Get recent events for an entity
    pub async fn get_events(&self, entity_id: &EntityId, limit: usize) -> Result<Vec<LedgerEvent>> {
        let url = format!(
            "{}/ledger/{}/events?limit={}",
            self.endpoint, entity_id, limit
        );

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| OfficeError::UblError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Ok(vec![]);
        }

        resp.json().await
            .map_err(|e| OfficeError::UblError(format!("Parse failed: {}", e)))
    }

    /// Get events after a specific timestamp
    pub async fn get_events_after(
        &self,
        entity_id: &EntityId,
        after: DateTime<Utc>,
    ) -> Result<Vec<LedgerEvent>> {
        let url = format!(
            "{}/ledger/{}/events?after={}",
            self.endpoint, entity_id, after.timestamp()
        );

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| OfficeError::UblError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Ok(vec![]);
        }

        resp.json().await
            .map_err(|e| OfficeError::UblError(format!("Parse failed: {}", e)))
    }

    /// Get available affordances for an entity
    pub async fn get_affordances(&self, entity_id: &EntityId) -> Result<Vec<UblAffordance>> {
        let url = format!("{}/affordances/{}", self.endpoint, entity_id);

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| OfficeError::UblError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Ok(vec![]);
        }

        resp.json().await
            .map_err(|e| OfficeError::UblError(format!("Parse failed: {}", e)))
    }

    /// Get pending obligations for an entity
    pub async fn get_obligations(&self, entity_id: &EntityId) -> Result<Vec<UblObligation>> {
        let url = format!("{}/obligations/{}", self.endpoint, entity_id);

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| OfficeError::UblError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Ok(vec![]);
        }

        resp.json().await
            .map_err(|e| OfficeError::UblError(format!("Parse failed: {}", e)))
    }

    /// Get the last handover for an entity
    pub async fn get_last_handover(&self, entity_id: &EntityId) -> Result<Option<String>> {
        let url = format!("{}/entities/{}/handover/latest", self.endpoint, entity_id);

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| OfficeError::UblError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Ok(None);
        }

        let handover: HandoverResponse = resp.json().await
            .map_err(|e| OfficeError::UblError(format!("Parse failed: {}", e)))?;

        Ok(Some(handover.content))
    }

    /// Get handovers for an entity
    pub async fn get_handovers(&self, entity_id: &EntityId, limit: usize) -> Result<Vec<Handover>> {
        let url = format!(
            "{}/entities/{}/handovers?limit={}",
            self.endpoint, entity_id, limit
        );

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| OfficeError::UblError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Ok(vec![]);
        }

        resp.json().await
            .map_err(|e| OfficeError::UblError(format!("Parse failed: {}", e)))
    }

    /// Get guardian info
    pub async fn get_guardian(&self, guardian_id: &str) -> Result<GuardianResponse> {
        let url = format!("{}/guardians/{}", self.endpoint, guardian_id);

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| OfficeError::UblError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Err(OfficeError::UblError("Guardian not found".to_string()));
        }

        resp.json().await
            .map_err(|e| OfficeError::UblError(format!("Parse failed: {}", e)))
    }

    /// Get resolved issues
    pub async fn get_resolved_issues(&self, entity_id: &EntityId) -> Result<Vec<ResolvedIssue>> {
        let url = format!("{}/entities/{}/issues?status=resolved", self.endpoint, entity_id);

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| OfficeError::UblError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Ok(vec![]);
        }

        resp.json().await
            .map_err(|e| OfficeError::UblError(format!("Parse failed: {}", e)))
    }

    /// Get trajectories (session history)
    pub async fn get_trajectories(&self, entity_id: &EntityId, days: u32) -> Result<Vec<Trajectory>> {
        let url = format!(
            "{}/entities/{}/trajectories?days={}",
            self.endpoint, entity_id, days
        );

        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| OfficeError::UblError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Ok(vec![]);
        }

        resp.json().await
            .map_err(|e| OfficeError::UblError(format!("Parse failed: {}", e)))
    }

    /// Commit a link to the ledger
    pub async fn commit(&self, link: LinkCommit) -> Result<CommitResponse> {
        let url = format!("{}/link/commit", self.endpoint);

        let resp = self.client.post(&url)
            .json(&link)
            .send()
            .await
            .map_err(|e| OfficeError::UblError(format!("Request failed: {}", e)))?;

        if !resp.status().is_success() {
            let error_text = resp.text().await.unwrap_or_default();
            return Err(OfficeError::UblError(format!("Commit failed: {}", error_text)));
        }

        resp.json().await
            .map_err(|e| OfficeError::UblError(format!("Parse failed: {}", e)))
    }

    /// Subscribe to event stream (SSE)
    pub async fn subscribe(&self, entity_id: &EntityId) -> Result<EventStream> {
        let url = format!("{}/ledger/{}/tail", self.endpoint, entity_id);
        EventStream::connect(&url).await
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HandoverResponse {
    content: String,
    session_id: String,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuardianResponse {
    pub id: String,
    pub name: String,
    pub is_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedIssue {
    pub id: String,
    pub description: String,
    pub resolved_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trajectory {
    pub session_id: String,
    pub session_type: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub tokens_used: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkCommit {
    pub version: u8,
    pub container_id: String,
    pub expected_sequence: u64,
    pub previous_hash: String,
    pub atom_hash: String,
    pub intent_class: String,
    pub physics_delta: i64,
    pub pact: Option<PactProof>,
    pub author_pubkey: String,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PactProof {
    pub pact_id: String,
    pub signatures: Vec<PactSignature>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PactSignature {
    pub pubkey: String,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitResponse {
    pub ok: bool,
    pub entry_hash: String,
    pub sequence: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = UblClient::new("http://localhost:3000", "office", 30000);
        assert_eq!(client.endpoint, "http://localhost:3000");
        assert_eq!(client.container_id, "office");
    }
}
