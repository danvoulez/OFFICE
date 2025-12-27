//! # OFFICE - LLM Operating System
//!
//! Runtime for LLM Entities implementing the Universal Historical Specification.
//!
//! ## Core Concepts
//!
//! - **Entity**: Persistent LLM identity with cryptographic keys
//! - **Instance**: Ephemeral LLM session that executes work
//! - **Context Frame**: Immutable snapshot of relevant state
//! - **Narrator**: Transforms data into situated narrative
//! - **Handover**: Knowledge transfer between instances
//! - **Constitution**: Behavioral directives that override RLHF
//! - **Sanity Check**: Validates claims against objective facts
//! - **Dreaming Cycle**: Consolidates memory and removes anxiety
//!
//! ## Architecture
//!
//! ```text
//! ┌─────────────────┐
//! │ 1. Narrator     │ → Builds narrative from UBL state
//! │    (Preparation)│    Applies Sanity Check
//! └────────┬────────┘    Injects Constitution
//!          ↓
//! ┌─────────────────┐
//! │ 2. Context      │ → Identity, State, Obligations
//! │    Frame        │    Capacities, Memory, Affordances
//! └────────┬────────┘
//!          ↓
//! ┌─────────────────┐
//! │ 3. LLM Instance │ → Receives complete frame
//! │    (Invocation) │    Executes work
//! └────────┬────────┘    Writes handover
//!          ↓
//! ┌─────────────────┐
//! │ 4. Ledger       │ → Registers actions
//! │    (UBL)        │    Stores receipts
//! └─────────────────┘    Maintains identity
//! ```

pub mod entity;
pub mod context;
pub mod session;
pub mod governance;
pub mod ubl_client;
pub mod llm;
pub mod api;

// Re-exports for convenience
pub use entity::{Entity, EntityId, Instance, Guardian};
pub use context::{ContextFrame, ContextFrameBuilder, Narrator, Memory};
pub use session::{Session, SessionType, SessionMode, Handover, TokenBudget};
pub use governance::{SanityCheck, Constitution, DreamingCycle, Simulation};
pub use ubl_client::UblClient;
pub use llm::LlmProvider;

use thiserror::Error;

/// Core error types for OFFICE
#[derive(Error, Debug)]
pub enum OfficeError {
    #[error("Entity not found: {0}")]
    EntityNotFound(String),

    #[error("Session error: {0}")]
    SessionError(String),

    #[error("Context building error: {0}")]
    ContextError(String),

    #[error("UBL client error: {0}")]
    UblError(String),

    #[error("LLM provider error: {0}")]
    LlmError(String),

    #[error("Governance error: {0}")]
    GovernanceError(String),

    #[error("Cryptographic error: {0}")]
    CryptoError(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, OfficeError>;

/// Configuration for OFFICE runtime
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct OfficeConfig {
    /// Server configuration
    pub server: ServerConfig,
    /// UBL connection configuration
    pub ubl: UblConfig,
    /// LLM provider configuration
    pub llm: LlmConfig,
    /// Governance configuration
    pub governance: GovernanceConfig,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub cors_origins: Vec<String>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct UblConfig {
    pub endpoint: String,
    pub container_id: String,
    pub timeout_ms: u64,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct LlmConfig {
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub max_tokens: u32,
    pub temperature: f32,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct GovernanceConfig {
    pub sanity_check_enabled: bool,
    pub dreaming_interval_hours: u32,
    pub dreaming_session_threshold: u32,
    pub simulation_required_risk_score: f32,
}

impl Default for OfficeConfig {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 8080,
                cors_origins: vec!["*".to_string()],
            },
            ubl: UblConfig {
                endpoint: "http://localhost:3000".to_string(),
                container_id: "office".to_string(),
                timeout_ms: 30000,
            },
            llm: LlmConfig {
                provider: "anthropic".to_string(),
                api_key: String::new(),
                model: "claude-3-5-sonnet-20241022".to_string(),
                max_tokens: 4096,
                temperature: 0.7,
            },
            governance: GovernanceConfig {
                sanity_check_enabled: true,
                dreaming_interval_hours: 24,
                dreaming_session_threshold: 50,
                simulation_required_risk_score: 0.7,
            },
        }
    }
}
