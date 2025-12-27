//! UBL Messenger - Messaging System with OFFICE Integration
//!
//! A complete messaging platform that uses:
//! - OFFICE for LLM-powered smart features
//! - UBL for immutable message storage and audit

use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

mod conversation;
mod message;
mod office_client;
mod ubl_client;
mod ui;
mod intelligence;

use conversation::ConversationStore;
use message::MessageStore;
use office_client::OfficeClient;
use ubl_client::MessengerUblClient;

pub type Result<T> = std::result::Result<T, MessengerError>;

#[derive(Debug, thiserror::Error)]
pub enum MessengerError {
    #[error("Conversation not found: {0}")]
    ConversationNotFound(String),

    #[error("Message not found: {0}")]
    MessageNotFound(String),

    #[error("Participant not found: {0}")]
    ParticipantNotFound(String),

    #[error("OFFICE error: {0}")]
    OfficeError(String),

    #[error("UBL error: {0}")]
    UblError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}

/// Messenger configuration
#[derive(Debug, Clone, serde::Deserialize)]
pub struct MessengerConfig {
    pub server: ServerConfig,
    pub office: OfficeConfig,
    pub ubl: UblConfig,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct OfficeConfig {
    pub endpoint: String,
    pub timeout_ms: u64,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct UblConfig {
    pub endpoint: String,
    pub container_id: String,
}

impl Default for MessengerConfig {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 8081,
            },
            office: OfficeConfig {
                endpoint: "http://localhost:8080".to_string(),
                timeout_ms: 30000,
            },
            ubl: UblConfig {
                endpoint: "http://localhost:3000".to_string(),
                container_id: "messenger".to_string(),
            },
        }
    }
}

/// Application state
pub struct AppState {
    pub config: MessengerConfig,
    pub conversations: ConversationStore,
    pub messages: MessageStore,
    pub office_client: OfficeClient,
    pub ubl_client: std::sync::Arc<MessengerUblClient>,
}

impl AppState {
    pub fn new(config: MessengerConfig) -> Self {
        let office_client = OfficeClient::new(&config.office.endpoint, config.office.timeout_ms);
        let ubl_client = std::sync::Arc::new(MessengerUblClient::new(&config.ubl.endpoint, &config.ubl.container_id));

        Self {
            config,
            conversations: ConversationStore::new(),
            messages: MessageStore::new(),
            office_client,
            ubl_client,
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .with_target(true)
        .json()
        .init();

    info!("Starting UBL Messenger");

    // Load configuration
    let config = load_config()?;
    info!("Configuration loaded");

    // Create application state
    let state = Arc::new(RwLock::new(AppState::new(config.clone())));

    // Create router
    let app = ui::api::create_router(state);

    // Bind and serve
    let addr = format!("{}:{}", config.server.host, config.server.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    info!("Messenger listening on {}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

fn load_config() -> Result<MessengerConfig> {
    let config = config::Config::builder()
        .add_source(config::File::with_name("config/messenger").required(false))
        .add_source(config::Environment::with_prefix("MESSENGER").separator("__"))
        .build()
        .ok()
        .and_then(|c| c.try_deserialize().ok())
        .unwrap_or_else(MessengerConfig::default);

    Ok(config)
}
