//! HTTP API Routes

use std::collections::HashMap;
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

use crate::entity::{Entity, EntityId, EntityParams, EntityType, Instance};
use crate::session::{Session, SessionType, SessionMode, SessionConfig, Handover};
use crate::context::{ContextFrameBuilder, Narrator, NarrativeConfig};
use crate::governance::{Constitution, SanityCheck, DreamingCycle, DreamingConfig, Simulation, SimulationConfig};
use crate::ubl_client::UblClient;
use crate::llm::{LlmProvider, LlmRequest, LlmMessage};
use crate::{OfficeConfig, Result, OfficeError};

/// Application state
pub struct AppState {
    pub config: OfficeConfig,
    pub ubl_client: Arc<UblClient>,
    pub llm_provider: Arc<dyn LlmProvider>,
    pub entities: HashMap<EntityId, Entity>,
    pub sessions: HashMap<String, Session>,
    pub instances: HashMap<String, Instance>,
}

impl AppState {
    pub fn new(
        config: OfficeConfig,
        ubl_client: Arc<UblClient>,
        llm_provider: Arc<dyn LlmProvider>,
    ) -> Self {
        Self {
            config,
            ubl_client,
            llm_provider,
            entities: HashMap::new(),
            sessions: HashMap::new(),
            instances: HashMap::new(),
        }
    }
}

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

        // Entities
        .route("/entities", post(create_entity))
        .route("/entities", get(list_entities))
        .route("/entities/:id", get(get_entity))
        .route("/entities/:id", delete(delete_entity))

        // Sessions
        .route("/entities/:id/sessions", post(create_session))
        .route("/entities/:id/sessions/:sid", get(get_session))
        .route("/entities/:id/sessions/:sid", delete(end_session))
        .route("/entities/:id/sessions/:sid/message", post(send_message))

        // Dreaming
        .route("/entities/:id/dream", post(trigger_dream))
        .route("/entities/:id/memory", get(get_memory))

        // Constitution
        .route("/entities/:id/constitution", post(update_constitution))
        .route("/entities/:id/constitution", get(get_constitution))

        // Simulation
        .route("/simulate", post(simulate_action))

        // Affordances
        .route("/affordances", get(list_affordances))
        .route("/affordances/:id", get(get_affordance))

        .layer(cors)
        .with_state(state)
}

// ============ Health ============

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "office",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

// ============ Entities ============

#[derive(Debug, Deserialize)]
struct CreateEntityRequest {
    name: String,
    entity_type: EntityType,
    guardian_id: Option<String>,
    constitution: Option<Constitution>,
    baseline_narrative: Option<String>,
}

async fn create_entity(
    State(state): State<SharedState>,
    Json(req): Json<CreateEntityRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let params = EntityParams {
        name: req.name,
        entity_type: req.entity_type,
        guardian_id: req.guardian_id,
        constitution: req.constitution,
        baseline_narrative: req.baseline_narrative,
        metadata: None,
    };

    let entity = Entity::new(params)?;
    let id = entity.id.clone();

    let mut state = state.write().await;
    state.entities.insert(id.clone(), entity.clone());

    info!("Created entity: {}", id);

    Ok((StatusCode::CREATED, Json(entity)))
}

async fn list_entities(
    State(state): State<SharedState>,
) -> impl IntoResponse {
    let state = state.read().await;
    let entities: Vec<&Entity> = state.entities.values().collect();
    Json(entities)
}

async fn get_entity(
    State(state): State<SharedState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let state = state.read().await;
    let entity = state.entities.get(&id)
        .ok_or_else(|| ApiError::NotFound(format!("Entity not found: {}", id)))?;
    Ok(Json(entity.clone()))
}

async fn delete_entity(
    State(state): State<SharedState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let mut state = state.write().await;

    if let Some(mut entity) = state.entities.get_mut(&id) {
        entity.archive();
        info!("Archived entity: {}", id);
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(ApiError::NotFound(format!("Entity not found: {}", id)))
    }
}

// ============ Sessions ============

#[derive(Debug, Deserialize)]
struct CreateSessionRequest {
    session_type: SessionType,
    session_mode: Option<SessionMode>,
    token_budget: Option<u64>,
    initiator: String,
}

async fn create_session(
    State(state): State<SharedState>,
    Path(entity_id): Path<String>,
    Json(req): Json<CreateSessionRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let mut state = state.write().await;

    // Check entity exists
    let entity = state.entities.get(&entity_id)
        .ok_or_else(|| ApiError::NotFound(format!("Entity not found: {}", entity_id)))?
        .clone();

    if !entity.is_active() {
        return Err(ApiError::BadRequest("Entity is not active".to_string()));
    }

    // Create session config
    let mode = req.session_mode.unwrap_or(SessionMode::Commitment);
    let config = SessionConfig {
        session_type: req.session_type,
        session_mode: mode,
    };

    let mut session = Session::new(entity_id.clone(), config, req.initiator);

    if let Some(budget) = req.token_budget {
        session = session.with_budget(budget);
    }

    // Build context frame
    let frame = ContextFrameBuilder::new(
        entity.clone(),
        req.session_type,
        state.ubl_client.clone(),
    )
    .build()
    .await?;

    // Generate narrative
    let narrator = Narrator::default();
    let narrative = narrator.generate(&frame);

    // Create instance
    let mut instance = Instance::new(
        entity_id.clone(),
        req.session_type,
        mode,
        session.token_budget,
    );
    instance.set_context(frame.clone());
    instance.start();

    session.start();
    session.set_instance(instance.id.clone());

    let session_id = session.id.clone();
    let instance_id = instance.id.clone();

    state.sessions.insert(session_id.clone(), session.clone());
    state.instances.insert(instance_id.clone(), instance);

    info!("Created session: {} for entity: {}", session_id, entity_id);

    Ok((StatusCode::CREATED, Json(serde_json::json!({
        "session": session,
        "narrative": narrative,
        "frame_hash": frame.frame_hash
    }))))
}

async fn get_session(
    State(state): State<SharedState>,
    Path((entity_id, session_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let state = state.read().await;

    let session = state.sessions.get(&session_id)
        .ok_or_else(|| ApiError::NotFound(format!("Session not found: {}", session_id)))?;

    if session.entity_id != entity_id {
        return Err(ApiError::NotFound("Session not found for entity".to_string()));
    }

    Ok(Json(session.clone()))
}

async fn end_session(
    State(state): State<SharedState>,
    Path((entity_id, session_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, ApiError> {
    let mut state = state.write().await;

    let session = state.sessions.get_mut(&session_id)
        .ok_or_else(|| ApiError::NotFound(format!("Session not found: {}", session_id)))?;

    if session.entity_id != entity_id {
        return Err(ApiError::NotFound("Session not found for entity".to_string()));
    }

    session.complete(None);

    // Update entity stats
    if let Some(entity) = state.entities.get_mut(&entity_id) {
        entity.record_session(session.tokens_consumed);
    }

    info!("Ended session: {}", session_id);

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
struct SendMessageRequest {
    content: String,
}

#[derive(Debug, Serialize)]
struct MessageResponse {
    response: String,
    tokens_used: u64,
    session_remaining: u64,
}

async fn send_message(
    State(state): State<SharedState>,
    Path((entity_id, session_id)): Path<(String, String)>,
    Json(req): Json<SendMessageRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let mut state_guard = state.write().await;

    let session = state_guard.sessions.get_mut(&session_id)
        .ok_or_else(|| ApiError::NotFound(format!("Session not found: {}", session_id)))?;

    if session.entity_id != entity_id {
        return Err(ApiError::NotFound("Session not found for entity".to_string()));
    }

    if !session.is_active() {
        return Err(ApiError::BadRequest("Session is not active".to_string()));
    }

    // Get context from instance
    let instance = state_guard.instances.get(&session.current_instance_id.clone().unwrap_or_default())
        .ok_or_else(|| ApiError::BadRequest("No active instance".to_string()))?;

    let context = instance.context_frame.as_ref()
        .ok_or_else(|| ApiError::BadRequest("No context frame".to_string()))?;

    // Build narrative
    let narrator = Narrator::default();
    let narrative = narrator.generate(context);

    // Create LLM request
    let llm_request = LlmRequest::new(vec![
        LlmMessage::system(narrative),
        LlmMessage::user(req.content),
    ])
    .with_max_tokens(session.remaining_budget() as u32);

    let llm_provider = state_guard.llm_provider.clone();

    // Release lock before async call
    drop(state_guard);

    // Call LLM
    let response = llm_provider.chat(llm_request).await?;

    // Update session
    let mut state_guard = state.write().await;
    let session = state_guard.sessions.get_mut(&session_id).unwrap();
    session.consume_tokens(response.usage.total_tokens as u64);

    // Update instance
    if let Some(instance) = state_guard.instances.get_mut(&session.current_instance_id.clone().unwrap_or_default()) {
        instance.consume_tokens(response.usage.total_tokens as u64);
    }

    Ok(Json(MessageResponse {
        response: response.content,
        tokens_used: response.usage.total_tokens as u64,
        session_remaining: session.remaining_budget(),
    }))
}

// ============ Dreaming ============

async fn trigger_dream(
    State(state): State<SharedState>,
    Path(entity_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let state_guard = state.read().await;

    let entity = state_guard.entities.get(&entity_id)
        .ok_or_else(|| ApiError::NotFound(format!("Entity not found: {}", entity_id)))?
        .clone();

    let ubl_client = state_guard.ubl_client.clone();
    let llm_provider = state_guard.llm_provider.clone();

    drop(state_guard);

    // Create dreaming cycle
    let config = DreamingConfig::default();
    let dreaming = DreamingCycle::new(config, ubl_client)
        .with_llm_provider(llm_provider);

    // Execute with a copy of memory
    let mut memory = crate::context::Memory::new(entity.baseline_narrative.clone());
    let result = dreaming.execute(&entity_id, &mut memory).await?;

    // Update entity
    let mut state_guard = state.write().await;
    if let Some(entity) = state_guard.entities.get_mut(&entity_id) {
        entity.update_baseline(result.new_baseline.clone());
        entity.record_dream();
    }

    info!("Completed dreaming cycle for entity: {}", entity_id);

    Ok(Json(result))
}

async fn get_memory(
    State(state): State<SharedState>,
    Path(entity_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let state = state.read().await;

    let entity = state.entities.get(&entity_id)
        .ok_or_else(|| ApiError::NotFound(format!("Entity not found: {}", entity_id)))?;

    Ok(Json(serde_json::json!({
        "entity_id": entity_id,
        "baseline_narrative": entity.baseline_narrative,
        "total_sessions": entity.total_sessions,
        "total_tokens": entity.total_tokens_consumed,
        "last_dream": entity.last_dream_at
    })))
}

// ============ Constitution ============

async fn update_constitution(
    State(state): State<SharedState>,
    Path(entity_id): Path<String>,
    Json(constitution): Json<Constitution>,
) -> Result<impl IntoResponse, ApiError> {
    let mut state = state.write().await;

    let entity = state.entities.get_mut(&entity_id)
        .ok_or_else(|| ApiError::NotFound(format!("Entity not found: {}", entity_id)))?;

    entity.update_constitution(constitution.clone());

    info!("Updated constitution for entity: {}", entity_id);

    Ok(Json(constitution))
}

async fn get_constitution(
    State(state): State<SharedState>,
    Path(entity_id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    let state = state.read().await;

    let entity = state.entities.get(&entity_id)
        .ok_or_else(|| ApiError::NotFound(format!("Entity not found: {}", entity_id)))?;

    Ok(Json(entity.constitution.clone()))
}

// ============ Simulation ============

#[derive(Debug, Deserialize)]
struct SimulateRequest {
    action_id: String,
    action_name: String,
    parameters: serde_json::Value,
    risk_score: f32,
    entity_id: String,
}

async fn simulate_action(
    State(state): State<SharedState>,
    Json(req): Json<SimulateRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let simulation = Simulation::new(SimulationConfig::default());

    let action = crate::governance::simulation::Action {
        id: req.action_id,
        name: req.action_name,
        parameters: req.parameters,
        risk_score: req.risk_score,
        entity_id: req.entity_id,
    };

    let result = simulation.simulate(action).await?;

    Ok(Json(result))
}

// ============ Affordances ============

async fn list_affordances(
    State(state): State<SharedState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<impl IntoResponse, ApiError> {
    let state = state.read().await;

    if let Some(entity_id) = params.get("entity_id") {
        let affordances = state.ubl_client.get_affordances(entity_id).await
            .unwrap_or_default();
        Ok(Json(affordances))
    } else {
        Ok(Json(Vec::<crate::ubl_client::UblAffordance>::new()))
    }
}

async fn get_affordance(
    State(state): State<SharedState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, ApiError> {
    // In real implementation, would fetch specific affordance
    Err(ApiError::NotFound(format!("Affordance not found: {}", id)))
}

// ============ Error Handling ============

#[derive(Debug)]
enum ApiError {
    NotFound(String),
    BadRequest(String),
    Internal(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        let body = Json(serde_json::json!({
            "error": message
        }));

        (status, body).into_response()
    }
}

impl From<OfficeError> for ApiError {
    fn from(err: OfficeError) -> Self {
        match err {
            OfficeError::EntityNotFound(msg) => ApiError::NotFound(msg),
            OfficeError::SessionError(msg) => ApiError::BadRequest(msg),
            _ => ApiError::Internal(err.to_string()),
        }
    }
}
