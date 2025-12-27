//! Conversation Management

use std::collections::HashMap;
use std::sync::RwLock;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub type ConversationId = String;
pub type ParticipantId = String;

/// Participant type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ParticipantType {
    Human,
    Agent,
    System,
}

/// A participant in a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Participant {
    pub id: ParticipantId,
    pub name: String,
    pub participant_type: ParticipantType,
    pub avatar: Option<String>,
    pub entity_id: Option<String>, // OFFICE entity ID for agents
    pub joined_at: DateTime<Utc>,
    pub is_active: bool,
}

/// A pinned asset in a conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PinnedAsset {
    pub id: String,
    pub asset_type: String, // file, link, code
    pub title: String,
    pub url: Option<String>,
    pub content: Option<String>,
    pub pinned_by: ParticipantId,
    pub pinned_at: DateTime<Utc>,
}

/// A conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: ConversationId,
    pub name: Option<String>,
    pub is_group: bool,
    pub participants: Vec<Participant>,
    pub pinned_assets: Vec<PinnedAsset>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_message_preview: Option<String>,
    pub unread_count: u32,
    pub is_muted: bool,
    pub is_archived: bool,
    pub metadata: serde_json::Value,
}

impl Conversation {
    /// Create a new conversation
    pub fn new(participants: Vec<Participant>, name: Option<String>) -> Self {
        let is_group = participants.len() > 2;
        let now = Utc::now();

        Self {
            id: format!("conv_{}", Uuid::new_v4()),
            name,
            is_group,
            participants,
            pinned_assets: Vec::new(),
            created_at: now,
            updated_at: now,
            last_message_preview: None,
            unread_count: 0,
            is_muted: false,
            is_archived: false,
            metadata: serde_json::json!({}),
        }
    }

    /// Add a participant
    pub fn add_participant(&mut self, participant: Participant) {
        if !self.participants.iter().any(|p| p.id == participant.id) {
            self.participants.push(participant);
            self.is_group = self.participants.len() > 2;
            self.updated_at = Utc::now();
        }
    }

    /// Remove a participant
    pub fn remove_participant(&mut self, participant_id: &str) {
        self.participants.retain(|p| p.id != participant_id);
        self.is_group = self.participants.len() > 2;
        self.updated_at = Utc::now();
    }

    /// Pin an asset
    pub fn pin_asset(&mut self, asset: PinnedAsset) {
        if !self.pinned_assets.iter().any(|a| a.id == asset.id) {
            self.pinned_assets.push(asset);
            self.updated_at = Utc::now();
        }
    }

    /// Unpin an asset
    pub fn unpin_asset(&mut self, asset_id: &str) {
        self.pinned_assets.retain(|a| a.id != asset_id);
        self.updated_at = Utc::now();
    }

    /// Update last message preview
    pub fn set_last_message(&mut self, preview: String) {
        self.last_message_preview = Some(preview);
        self.updated_at = Utc::now();
    }

    /// Check if participant is in conversation
    pub fn has_participant(&self, participant_id: &str) -> bool {
        self.participants.iter().any(|p| p.id == participant_id)
    }

    /// Get LLM participants
    pub fn llm_participants(&self) -> Vec<&Participant> {
        self.participants
            .iter()
            .filter(|p| p.participant_type == ParticipantType::Agent)
            .collect()
    }
}

/// Conversation store (in-memory)
pub struct ConversationStore {
    conversations: RwLock<HashMap<ConversationId, Conversation>>,
}

impl ConversationStore {
    pub fn new() -> Self {
        Self {
            conversations: RwLock::new(HashMap::new()),
        }
    }

    pub fn create(&self, conversation: Conversation) -> ConversationId {
        let id = conversation.id.clone();
        self.conversations.write().unwrap().insert(id.clone(), conversation);
        id
    }

    pub fn get(&self, id: &str) -> Option<Conversation> {
        self.conversations.read().unwrap().get(id).cloned()
    }

    pub fn update(&self, conversation: Conversation) {
        self.conversations.write().unwrap().insert(conversation.id.clone(), conversation);
    }

    pub fn delete(&self, id: &str) -> bool {
        self.conversations.write().unwrap().remove(id).is_some()
    }

    pub fn list(&self) -> Vec<Conversation> {
        self.conversations.read().unwrap().values().cloned().collect()
    }

    pub fn list_for_participant(&self, participant_id: &str) -> Vec<Conversation> {
        self.conversations
            .read()
            .unwrap()
            .values()
            .filter(|c| c.has_participant(participant_id))
            .cloned()
            .collect()
    }
}

impl Default for ConversationStore {
    fn default() -> Self {
        Self::new()
    }
}
