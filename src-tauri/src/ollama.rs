use crate::ModelInfo;
use futures::stream::{self, BoxStream};
use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct ChatStreamResponse {
    pub message: ChatMessageResponse,
    pub done: bool,
}

#[derive(Debug, Deserialize)]
pub struct ChatMessageResponse {
    #[allow(dead_code)]
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
struct TagsResponse {
    models: Vec<TagModel>,
}

#[derive(Debug, Deserialize)]
struct TagModel {
    name: String,
    size: u64,
    modified_at: String,
}

pub struct OllamaClient {
    base_url: String,
    client: Client,
}

impl OllamaClient {
    pub fn new(base_url: &str) -> Self {
        Self {
            base_url: base_url.to_string(),
            client: Client::new(),
        }
    }

    pub async fn is_running(&self) -> bool {
        self.client
            .get(&self.base_url)
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }

    pub async fn list_models(&self) -> Result<Vec<ModelInfo>, reqwest::Error> {
        let url = format!("{}/api/tags", self.base_url);
        let resp: TagsResponse = self.client.get(&url).send().await?.json().await?;
        Ok(resp
            .models
            .into_iter()
            .map(|m| ModelInfo {
                name: m.name,
                size: m.size,
                modified_at: m.modified_at,
            })
            .collect())
    }

    pub async fn chat_stream(
        &self,
        model: &str,
        messages: &[ChatMessage],
    ) -> Result<BoxStream<'static, Result<ChatStreamResponse, String>>, reqwest::Error> {
        let url = format!("{}/api/chat", self.base_url);
        let body = serde_json::json!({
            "model": model,
            "messages": messages,
            "stream": true,
        });

        let response = self.client.post(&url).json(&body).send().await?;

        let stream = response.bytes_stream();

        let parsed_stream = stream
            .map(|chunk_result| match chunk_result {
                Ok(bytes) => {
                    let text = String::from_utf8_lossy(&bytes).to_string();
                    let mut results = Vec::new();
                    for line in text.lines() {
                        let line = line.trim();
                        if line.is_empty() {
                            continue;
                        }
                        match serde_json::from_str::<ChatStreamResponse>(line) {
                            Ok(parsed) => results.push(Ok(parsed)),
                            Err(e) => results.push(Err(format!("Parse error: {}", e))),
                        }
                    }
                    stream::iter(results)
                }
                Err(e) => stream::iter(vec![Err(format!("Stream error: {}", e))]),
            })
            .flatten();

        Ok(Box::pin(parsed_stream))
    }
}
