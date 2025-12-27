//! Intelligence Module
//!
//! Smart features powered by OFFICE.

use crate::office_client::OfficeClient;
use crate::Result;

/// Summarization service
pub struct SummarizationService {
    office_client: OfficeClient,
}

impl SummarizationService {
    pub fn new(office_client: OfficeClient) -> Self {
        Self { office_client }
    }

    /// Summarize messages
    pub async fn summarize(&self, entity_id: &str, messages: &[String]) -> Result<String> {
        self.office_client.summarize(entity_id, messages).await
    }
}

/// Sentiment analysis service
pub struct SentimentService {
    office_client: OfficeClient,
}

impl SentimentService {
    pub fn new(office_client: OfficeClient) -> Self {
        Self { office_client }
    }

    /// Analyze sentiment
    pub async fn analyze(&self, entity_id: &str, text: &str) -> Result<crate::office_client::SentimentResult> {
        self.office_client.analyze_sentiment(entity_id, text).await
    }
}

/// Reply suggestions service
pub struct SuggestionService {
    office_client: OfficeClient,
}

impl SuggestionService {
    pub fn new(office_client: OfficeClient) -> Self {
        Self { office_client }
    }

    /// Get reply suggestions
    pub async fn suggest(&self, entity_id: &str, context: &str) -> Result<Vec<String>> {
        self.office_client.suggest_replies(entity_id, context).await
    }
}

/// Action extraction service
pub struct ActionService {
    office_client: OfficeClient,
}

impl ActionService {
    pub fn new(office_client: OfficeClient) -> Self {
        Self { office_client }
    }

    /// Extract action items
    pub async fn extract(&self, entity_id: &str, messages: &[String]) -> Result<Vec<crate::office_client::ActionItem>> {
        self.office_client.extract_actions(entity_id, messages).await
    }
}
