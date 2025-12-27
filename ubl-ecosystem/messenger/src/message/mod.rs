//! Message Management

use std::collections::HashMap;
use std::sync::RwLock;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use uuid::Uuid;

use crate::conversation::{ConversationId, ParticipantId};

pub type MessageId = String;

/// Message type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageType {
    Chat,
    Command,
    Agreement,
    SystemAlert,
}

/// Message status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageStatus {
    Pending,
    Signed,
    Broadcasted,
    Failed,
}

/// Rich payload in a message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RichPayload {
    #[serde(rename = "type")]
    pub payload_type: String, // code, alert, filesystem, terminal, web
    pub title: Option<String>,
    pub description: Option<String>,
    pub url: Option<String>,
    pub content: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// Action button in a message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageAction {
    pub id: String,
    pub label: String,
    pub action_type: String, // link, callback, command
    pub value: String,
}

/// Reaction to a message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reaction {
    pub emoji: String,
    pub user_id: ParticipantId,
    pub created_at: DateTime<Utc>,
}

/// A message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: MessageId,
    pub conversation_id: ConversationId,
    pub from: ParticipantId,
    pub content: String,
    pub message_type: MessageType,
    pub status: MessageStatus,
    pub hash: String,
    pub timestamp: DateTime<Utc>,
    pub edited_at: Option<DateTime<Utc>>,
    pub deleted: bool,
    pub reply_to: Option<MessageId>,
    pub payloads: Vec<RichPayload>,
    pub actions: Vec<MessageAction>,
    pub reactions: Vec<Reaction>,
    pub read_by: Vec<ParticipantId>,
    pub cost: Option<f64>,
    pub metadata: serde_json::Value,
}

impl Message {
    /// Create a new message
    pub fn new(
        conversation_id: ConversationId,
        from: ParticipantId,
        content: String,
        message_type: MessageType,
    ) -> Self {
        let timestamp = Utc::now();
        let id = format!("msg_{}", Uuid::new_v4());
        let hash = Self::calculate_hash(&content, &timestamp);

        Self {
            id,
            conversation_id,
            from,
            content,
            message_type,
            status: MessageStatus::Pending,
            hash,
            timestamp,
            edited_at: None,
            deleted: false,
            reply_to: None,
            payloads: Vec::new(),
            actions: Vec::new(),
            reactions: Vec::new(),
            read_by: Vec::new(),
            cost: None,
            metadata: serde_json::json!({}),
        }
    }

    /// Calculate message hash
    fn calculate_hash(content: &str, timestamp: &DateTime<Utc>) -> String {
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        hasher.update(timestamp.to_rfc3339().as_bytes());
        hasher.update(Uuid::new_v4().to_string().as_bytes());
        format!("0X{}", hex::encode(&hasher.finalize()[..16]))
    }

    /// Calculate message cost
    pub fn calculate_cost(&mut self, is_agent: bool) {
        let base = if is_agent { 0.0004 } else { 0.0001 };
        let per_char = 0.000005;
        self.cost = Some(base + (self.content.len() as f64 * per_char));
    }

    /// Mark as signed
    pub fn sign(&mut self) {
        self.status = MessageStatus::Signed;
    }

    /// Mark as broadcasted
    pub fn broadcast(&mut self) {
        self.status = MessageStatus::Broadcasted;
    }

    /// Mark as failed
    pub fn fail(&mut self) {
        self.status = MessageStatus::Failed;
    }

    /// Edit message
    pub fn edit(&mut self, new_content: String) {
        self.content = new_content;
        self.edited_at = Some(Utc::now());
        self.hash = Self::calculate_hash(&self.content, &self.timestamp);
    }

    /// Soft delete
    pub fn delete(&mut self) {
        self.deleted = true;
    }

    /// Add reaction
    pub fn add_reaction(&mut self, emoji: String, user_id: ParticipantId) {
        // Remove existing reaction from same user with same emoji
        self.reactions.retain(|r| !(r.user_id == user_id && r.emoji == emoji));
        self.reactions.push(Reaction {
            emoji,
            user_id,
            created_at: Utc::now(),
        });
    }

    /// Remove reaction
    pub fn remove_reaction(&mut self, emoji: &str, user_id: &str) {
        self.reactions.retain(|r| !(r.user_id == user_id && r.emoji == emoji));
    }

    /// Mark as read
    pub fn mark_read(&mut self, user_id: ParticipantId) {
        if !self.read_by.contains(&user_id) {
            self.read_by.push(user_id);
        }
    }

    /// Add payload
    pub fn add_payload(&mut self, payload: RichPayload) {
        self.payloads.push(payload);
    }

    /// Add action
    pub fn add_action(&mut self, action: MessageAction) {
        self.actions.push(action);
    }
}

/// Message store (in-memory)
pub struct MessageStore {
    messages: RwLock<HashMap<MessageId, Message>>,
    by_conversation: RwLock<HashMap<ConversationId, Vec<MessageId>>>,
}

impl MessageStore {
    pub fn new() -> Self {
        Self {
            messages: RwLock::new(HashMap::new()),
            by_conversation: RwLock::new(HashMap::new()),
        }
    }

    pub fn create(&self, message: Message) -> MessageId {
        let id = message.id.clone();
        let conversation_id = message.conversation_id.clone();

        self.messages.write().unwrap().insert(id.clone(), message);
        self.by_conversation
            .write()
            .unwrap()
            .entry(conversation_id)
            .or_insert_with(Vec::new)
            .push(id.clone());

        id
    }

    pub fn get(&self, id: &str) -> Option<Message> {
        self.messages.read().unwrap().get(id).cloned()
    }

    pub fn update(&self, message: Message) {
        self.messages.write().unwrap().insert(message.id.clone(), message);
    }

    pub fn list_for_conversation(&self, conversation_id: &str) -> Vec<Message> {
        let by_conv = self.by_conversation.read().unwrap();
        let messages = self.messages.read().unwrap();

        by_conv
            .get(conversation_id)
            .map(|ids| {
                ids.iter()
                    .filter_map(|id| messages.get(id).cloned())
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn count_for_conversation(&self, conversation_id: &str) -> usize {
        self.by_conversation
            .read()
            .unwrap()
            .get(conversation_id)
            .map(|ids| ids.len())
            .unwrap_or(0)
    }
}

impl Default for MessageStore {
    fn default() -> Self {
        Self::new()
    }
}
