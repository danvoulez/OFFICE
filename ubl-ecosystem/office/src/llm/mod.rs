//! LLM Provider Module
//!
//! Abstractions for LLM providers (Anthropic, OpenAI, etc.)

mod provider;
mod anthropic;
mod openai;
mod local;

pub use provider::{LlmProvider, LlmRequest, LlmResponse, LlmMessage, MessageRole};
pub use anthropic::AnthropicProvider;
pub use openai::OpenAIProvider;
pub use local::LocalProvider;

use std::sync::Arc;

use crate::{LlmConfig, OfficeError, Result};

/// Create an LLM provider from configuration
pub fn create_provider(config: &LlmConfig) -> Result<Arc<dyn LlmProvider>> {
    match config.provider.to_lowercase().as_str() {
        "anthropic" | "claude" => {
            Ok(Arc::new(AnthropicProvider::new(
                &config.api_key,
                &config.model,
                config.max_tokens,
                config.temperature,
            )))
        }
        "openai" | "gpt" => {
            Ok(Arc::new(OpenAIProvider::new(
                &config.api_key,
                &config.model,
                config.max_tokens,
                config.temperature,
            )))
        }
        "local" | "mock" => {
            Ok(Arc::new(LocalProvider::new()))
        }
        _ => Err(OfficeError::ConfigError(format!(
            "Unknown LLM provider: {}",
            config.provider
        ))),
    }
}
