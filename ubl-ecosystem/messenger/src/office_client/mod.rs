//! OFFICE Client
//!
//! Client for interacting with OFFICE API for LLM features.

use std::time::Duration;

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::{MessengerError, Result};

/// OFFICE client
pub struct OfficeClient {
    endpoint: String,
    client: Client,
}

impl OfficeClient {
    pub fn new(endpoint: &str, timeout_ms: u64) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_millis(timeout_ms))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            endpoint: endpoint.to_string(),
            client,
        }
    }

    /// Create an LLM entity for a conversation
    pub async fn create_entity(&self, name: &str, constitution: Option<Constitution>) -> Result<Entity> {
        let req = CreateEntityRequest {
            name: name.to_string(),
            entity_type: "autonomous".to_string(),
            guardian_id: None,
            constitution,
        };

        let resp = self.client
            .post(&format!("{}/entities", self.endpoint))
            .json(&req)
            .send()
            .await
            .map_err(|e| MessengerError::OfficeError(e.to_string()))?;

        if !resp.status().is_success() {
            let error = resp.text().await.unwrap_or_default();
            return Err(MessengerError::OfficeError(error));
        }

        resp.json().await
            .map_err(|e| MessengerError::OfficeError(e.to_string()))
    }

    /// Create a session for an entity
    pub async fn create_session(&self, entity_id: &str, session_type: &str) -> Result<Session> {
        let req = CreateSessionRequest {
            session_type: session_type.to_string(),
            session_mode: Some("commitment".to_string()),
            token_budget: None,
            initiator: "messenger".to_string(),
        };

        let resp = self.client
            .post(&format!("{}/entities/{}/sessions", self.endpoint, entity_id))
            .json(&req)
            .send()
            .await
            .map_err(|e| MessengerError::OfficeError(e.to_string()))?;

        if !resp.status().is_success() {
            let error = resp.text().await.unwrap_or_default();
            return Err(MessengerError::OfficeError(error));
        }

        resp.json().await
            .map_err(|e| MessengerError::OfficeError(e.to_string()))
    }

    /// Send a message to an LLM entity
    pub async fn send_message(&self, entity_id: &str, session_id: &str, content: &str) -> Result<MessageResponse> {
        let req = SendMessageRequest {
            content: content.to_string(),
        };

        let resp = self.client
            .post(&format!("{}/entities/{}/sessions/{}/message", self.endpoint, entity_id, session_id))
            .json(&req)
            .send()
            .await
            .map_err(|e| MessengerError::OfficeError(e.to_string()))?;

        if !resp.status().is_success() {
            let error = resp.text().await.unwrap_or_default();
            return Err(MessengerError::OfficeError(error));
        }

        resp.json().await
            .map_err(|e| MessengerError::OfficeError(e.to_string()))
    }

    /// End a session
    pub async fn end_session(&self, entity_id: &str, session_id: &str) -> Result<()> {
        let resp = self.client
            .delete(&format!("{}/entities/{}/sessions/{}", self.endpoint, entity_id, session_id))
            .send()
            .await
            .map_err(|e| MessengerError::OfficeError(e.to_string()))?;

        if !resp.status().is_success() {
            let error = resp.text().await.unwrap_or_default();
            return Err(MessengerError::OfficeError(error));
        }

        Ok(())
    }

    /// Summarize a conversation
    pub async fn summarize(&self, entity_id: &str, messages: &[String]) -> Result<String> {
        // Create a session, send summarization request, end session
        let session = self.create_session(entity_id, "research").await?;

        let prompt = format!(
            "Please summarize the following conversation:\n\n{}",
            messages.join("\n---\n")
        );

        let response = self.send_message(entity_id, &session.session.id, &prompt).await?;

        let _ = self.end_session(entity_id, &session.session.id).await;

        Ok(response.response)
    }

    /// Analyze sentiment
    pub async fn analyze_sentiment(&self, entity_id: &str, text: &str) -> Result<SentimentResult> {
        let session = self.create_session(entity_id, "research").await?;

        let prompt = format!(
            "Analyze the sentiment of this message and respond with JSON: {{\"sentiment\": \"positive\"|\"neutral\"|\"negative\", \"confidence\": 0.0-1.0}}\n\nMessage: {}",
            text
        );

        let response = self.send_message(entity_id, &session.session.id, &prompt).await?;

        let _ = self.end_session(entity_id, &session.session.id).await;

        // Parse response
        serde_json::from_str(&response.response)
            .map_err(|e| MessengerError::OfficeError(format!("Failed to parse sentiment: {}", e)))
    }

    /// Generate reply suggestions
    pub async fn suggest_replies(&self, entity_id: &str, context: &str) -> Result<Vec<String>> {
        let session = self.create_session(entity_id, "assist").await?;

        let prompt = format!(
            "Based on this conversation context, suggest 3 possible replies. Respond with JSON array of strings.\n\nContext: {}",
            context
        );

        let response = self.send_message(entity_id, &session.session.id, &prompt).await?;

        let _ = self.end_session(entity_id, &session.session.id).await;

        serde_json::from_str(&response.response)
            .map_err(|e| MessengerError::OfficeError(format!("Failed to parse suggestions: {}", e)))
    }

    /// Extract action items
    pub async fn extract_actions(&self, entity_id: &str, messages: &[String]) -> Result<Vec<ActionItem>> {
        let session = self.create_session(entity_id, "research").await?;

        let prompt = format!(
            "Extract action items from this conversation. Respond with JSON array: [{{\"description\": string, \"assignee\": string|null, \"due_date\": string|null}}]\n\nConversation:\n{}",
            messages.join("\n---\n")
        );

        let response = self.send_message(entity_id, &session.session.id, &prompt).await?;

        let _ = self.end_session(entity_id, &session.session.id).await;

        serde_json::from_str(&response.response)
            .map_err(|e| MessengerError::OfficeError(format!("Failed to parse actions: {}", e)))
    }
}

// Request/Response types

#[derive(Debug, Serialize)]
struct CreateEntityRequest {
    name: String,
    entity_type: String,
    guardian_id: Option<String>,
    constitution: Option<Constitution>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Constitution {
    pub core_directive: String,
    pub behavioral_overrides: Vec<BehavioralOverride>,
    pub negotiation_stance: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehavioralOverride {
    pub trigger: String,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
struct CreateSessionRequest {
    session_type: String,
    session_mode: Option<String>,
    token_budget: Option<u64>,
    initiator: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub session: SessionInfo,
    pub narrative: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub id: String,
    pub entity_id: String,
}

#[derive(Debug, Serialize)]
struct SendMessageRequest {
    content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageResponse {
    pub response: String,
    pub tokens_used: u64,
    pub session_remaining: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentimentResult {
    pub sentiment: String,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionItem {
    pub description: String,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
}
