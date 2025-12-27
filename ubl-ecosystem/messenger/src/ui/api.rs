//! Messenger REST API

use std::sync::Arc;

use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, delete, patch},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tower_http::cors::{CorsLayer, Any};
use tracing::info;

use crate::conversation::{Conversation, Participant, ParticipantType, PinnedAsset};
use crate::message::{Message, MessageType};
use crate::AppState;

pub type SharedState = Arc<RwLock<AppState>>;

/// Create the router
pub fn create_router(state: SharedState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        // Health
        .route("/health", get(health))

        // Conversations
        .route("/conversations", post(create_conversation))
        .route("/conversations", get(list_conversations))
        .route("/conversations/:id", get(get_conversation))
        .route("/conversations/:id", patch(update_conversation))
        .route("/conversations/:id", delete(delete_conversation))

        // Participants
        .route("/conversations/:id/participants", post(add_participant))
        .route("/conversations/:id/participants/:pid", delete(remove_participant))

        // Messages
        .route("/conversations/:id/messages", post(send_message))
        .route("/conversations/:id/messages", get(get_messages))
        .route("/conversations/:id/messages/:mid", patch(edit_message))
        .route("/conversations/:id/messages/:mid", delete(delete_message))

        // Reactions
        .route("/conversations/:id/messages/:mid/reactions", post(add_reaction))

        // Read receipts
        .route("/conversations/:id/messages/:mid/read", get(mark_read))

        // LLM participant
        .route("/conversations/:id/llm", post(add_llm_participant))
        .route("/conversations/:id/llm/:lid", patch(update_llm_config))

        // Smart features
        .route("/conversations/:id/summarize", post(summarize))
        .route("/conversations/:id/extract-actions", post(extract_actions))

        // Ledger
        .route("/ledger/logs", get(get_ledger_logs))

        .layer(cors)
        .with_state(state)
}

// ============ Health ============

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "messenger",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

// ============ Conversations ============

#[derive(Debug, Deserialize)]
struct CreateConversationRequest {
    participants: Vec<ParticipantInput>,
    name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ParticipantInput {
    id: String,
    name: String,
    participant_type: ParticipantType,
    avatar: Option<String>,
}

async fn create_conversation(
    State(state): State<SharedState>,
    Json(req): Json<CreateConversationRequest>,
) -> impl IntoResponse {
    let participants: Vec<Participant> = req.participants
        .into_iter()
        .map(|p| Participant {
            id: p.id,
            name: p.name,
            participant_type: p.participant_type,
            avatar: p.avatar,
            entity_id: None,
            joined_at: chrono::Utc::now(),
            is_active: true,
        })
        .collect();

    let conversation = Conversation::new(participants, req.name);

    let state = state.read().await;
    let id = state.conversations.create(conversation.clone());

    info!("Created conversation: {}", id);

    (StatusCode::CREATED, Json(conversation))
}

async fn list_conversations(
    State(state): State<SharedState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let state = state.read().await;

    let conversations = if let Some(participant_id) = params.get("participant_id") {
        state.conversations.list_for_participant(participant_id)
    } else {
        state.conversations.list()
    };

    Json(conversations)
}

async fn get_conversation(
    State(state): State<SharedState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let state = state.read().await;
    state.conversations.get(&id)
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn update_conversation(
    State(state): State<SharedState>,
    Path(id): Path<String>,
    Json(updates): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let state = state.read().await;
    let mut conversation = state.conversations.get(&id)
        .ok_or(StatusCode::NOT_FOUND)?;

    if let Some(name) = updates.get("name").and_then(|v| v.as_str()) {
        conversation.name = Some(name.to_string());
    }
    if let Some(muted) = updates.get("is_muted").and_then(|v| v.as_bool()) {
        conversation.is_muted = muted;
    }
    if let Some(archived) = updates.get("is_archived").and_then(|v| v.as_bool()) {
        conversation.is_archived = archived;
    }

    state.conversations.update(conversation.clone());

    Ok(Json(conversation))
}

async fn delete_conversation(
    State(state): State<SharedState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let state = state.read().await;
    if state.conversations.delete(&id) {
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

// ============ Participants ============

async fn add_participant(
    State(state): State<SharedState>,
    Path(conv_id): Path<String>,
    Json(input): Json<ParticipantInput>,
) -> Result<impl IntoResponse, StatusCode> {
    let state = state.read().await;
    let mut conversation = state.conversations.get(&conv_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    let participant = Participant {
        id: input.id,
        name: input.name,
        participant_type: input.participant_type,
        avatar: input.avatar,
        entity_id: None,
        joined_at: chrono::Utc::now(),
        is_active: true,
    };

    conversation.add_participant(participant);
    state.conversations.update(conversation.clone());

    Ok(Json(conversation))
}

async fn remove_participant(
    State(state): State<SharedState>,
    Path((conv_id, participant_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, StatusCode> {
    let state = state.read().await;
    let mut conversation = state.conversations.get(&conv_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    conversation.remove_participant(&participant_id);
    state.conversations.update(conversation);

    Ok(StatusCode::NO_CONTENT)
}

// ============ Messages ============

#[derive(Debug, Deserialize)]
struct SendMessageRequest {
    from: String,
    content: String,
    message_type: Option<MessageType>,
    reply_to: Option<String>,
}

async fn send_message(
    State(state): State<SharedState>,
    Path(conv_id): Path<String>,
    Json(req): Json<SendMessageRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let state_guard = state.read().await;

    let conversation = state_guard.conversations.get(&conv_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    // Validate participant
    if !conversation.has_participant(&req.from) {
        return Err(StatusCode::FORBIDDEN);
    }

    let message_type = req.message_type.unwrap_or(MessageType::Chat);
    let mut message = Message::new(conv_id.clone(), req.from.clone(), req.content, message_type);

    if let Some(reply_to) = req.reply_to {
        message.reply_to = Some(reply_to);
    }

    // Check if sender is agent
    let is_agent = conversation.participants
        .iter()
        .find(|p| p.id == req.from)
        .map(|p| p.participant_type == ParticipantType::Agent)
        .unwrap_or(false);

    message.calculate_cost(is_agent);
    message.sign();
    message.broadcast();

    // Store message
    state_guard.messages.create(message.clone());

    // Store in UBL (async, don't block)
    let ubl_client = state_guard.ubl_client.clone();
    let msg_clone = message.clone();
    tokio::spawn(async move {
        let _ = ubl_client.store_message(&msg_clone).await;
    });

    // If there are LLM participants, trigger auto-reply
    let llm_participants = conversation.llm_participants();
    if !llm_participants.is_empty() && !is_agent {
        // Trigger LLM response (would be async in production)
        // For now, just log
        info!("Would trigger LLM response from {} participants", llm_participants.len());
    }

    Ok((StatusCode::CREATED, Json(message)))
}

async fn get_messages(
    State(state): State<SharedState>,
    Path(conv_id): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let state = state.read().await;

    // Verify conversation exists
    if state.conversations.get(&conv_id).is_none() {
        return Err(StatusCode::NOT_FOUND);
    }

    let messages = state.messages.list_for_conversation(&conv_id);
    Ok(Json(messages))
}

async fn edit_message(
    State(state): State<SharedState>,
    Path((conv_id, message_id)): Path<(String, String)>,
    Json(updates): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let state = state.read().await;

    let mut message = state.messages.get(&message_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    if message.conversation_id != conv_id {
        return Err(StatusCode::NOT_FOUND);
    }

    if let Some(content) = updates.get("content").and_then(|v| v.as_str()) {
        message.edit(content.to_string());
    }

    state.messages.update(message.clone());

    Ok(Json(message))
}

async fn delete_message(
    State(state): State<SharedState>,
    Path((conv_id, message_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, StatusCode> {
    let state = state.read().await;

    let mut message = state.messages.get(&message_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    if message.conversation_id != conv_id {
        return Err(StatusCode::NOT_FOUND);
    }

    message.delete();
    state.messages.update(message);

    Ok(StatusCode::NO_CONTENT)
}

// ============ Reactions ============

#[derive(Debug, Deserialize)]
struct AddReactionRequest {
    emoji: String,
    user_id: String,
}

async fn add_reaction(
    State(state): State<SharedState>,
    Path((conv_id, message_id)): Path<(String, String)>,
    Json(req): Json<AddReactionRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let state = state.read().await;

    let mut message = state.messages.get(&message_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    if message.conversation_id != conv_id {
        return Err(StatusCode::NOT_FOUND);
    }

    message.add_reaction(req.emoji, req.user_id);
    state.messages.update(message.clone());

    Ok(Json(message))
}

// ============ Read Receipts ============

#[derive(Debug, Deserialize)]
struct MarkReadRequest {
    user_id: String,
}

async fn mark_read(
    State(state): State<SharedState>,
    Path((conv_id, message_id)): Path<(String, String)>,
    Query(req): Query<MarkReadRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let state = state.read().await;

    let mut message = state.messages.get(&message_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    if message.conversation_id != conv_id {
        return Err(StatusCode::NOT_FOUND);
    }

    message.mark_read(req.user_id.clone());
    state.messages.update(message);

    // Store read receipt in UBL
    let ubl_client = state.ubl_client.clone();
    tokio::spawn(async move {
        let _ = ubl_client.store_read_receipt(&message_id, &req.user_id).await;
    });

    Ok(StatusCode::OK)
}

// ============ LLM Participant ============

#[derive(Debug, Deserialize)]
struct AddLlmRequest {
    name: String,
    constitution: Option<crate::office_client::Constitution>,
}

async fn add_llm_participant(
    State(state): State<SharedState>,
    Path(conv_id): Path<String>,
    Json(req): Json<AddLlmRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let state_guard = state.read().await;

    let mut conversation = state_guard.conversations.get(&conv_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    // Create entity in OFFICE
    let entity = state_guard.office_client
        .create_entity(&req.name, req.constitution)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Add as participant
    let participant = Participant {
        id: format!("llm_{}", entity.id),
        name: req.name,
        participant_type: ParticipantType::Agent,
        avatar: None,
        entity_id: Some(entity.id),
        joined_at: chrono::Utc::now(),
        is_active: true,
    };

    conversation.add_participant(participant.clone());
    state_guard.conversations.update(conversation);

    info!("Added LLM participant to conversation: {}", conv_id);

    Ok((StatusCode::CREATED, Json(participant)))
}

async fn update_llm_config(
    State(_state): State<SharedState>,
    Path((_conv_id, _llm_id)): Path<(String, String)>,
    Json(_updates): Json<serde_json::Value>,
) -> impl IntoResponse {
    // Would update LLM constitution via OFFICE
    StatusCode::NOT_IMPLEMENTED
}

// ============ Smart Features ============

async fn summarize(
    State(state): State<SharedState>,
    Path(conv_id): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let state = state.read().await;

    let conversation = state.conversations.get(&conv_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    // Get an LLM participant
    let llm = conversation.llm_participants()
        .first()
        .and_then(|p| p.entity_id.clone())
        .ok_or(StatusCode::BAD_REQUEST)?;

    // Get messages
    let messages: Vec<String> = state.messages
        .list_for_conversation(&conv_id)
        .iter()
        .map(|m| format!("{}: {}", m.from, m.content))
        .collect();

    if messages.is_empty() {
        return Ok(Json(serde_json::json!({"summary": "No messages to summarize."})));
    }

    // Call OFFICE for summarization
    let summary = state.office_client
        .summarize(&llm, &messages)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({"summary": summary})))
}

async fn extract_actions(
    State(state): State<SharedState>,
    Path(conv_id): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let state = state.read().await;

    let conversation = state.conversations.get(&conv_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    let llm = conversation.llm_participants()
        .first()
        .and_then(|p| p.entity_id.clone())
        .ok_or(StatusCode::BAD_REQUEST)?;

    let messages: Vec<String> = state.messages
        .list_for_conversation(&conv_id)
        .iter()
        .map(|m| format!("{}: {}", m.from, m.content))
        .collect();

    let actions = state.office_client
        .extract_actions(&llm, &messages)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({"actions": actions})))
}

// ============ Ledger ============

async fn get_ledger_logs(
    State(state): State<SharedState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    let state = state.read().await;

    let limit = params.get("limit")
        .and_then(|l| l.parse().ok())
        .unwrap_or(50);

    let logs = state.ubl_client.get_logs(limit).await.unwrap_or_default();

    Json(serde_json::json!({
        "logs": logs,
        "count": logs.len()
    }))
}
