use crate::{LibraryModel, ModelInfo};
use futures::stream::{self, BoxStream};
use futures::StreamExt;
use reqwest::Client;
use scraper::{Html, Selector};
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

#[derive(Debug, Deserialize)]
pub struct PullProgressResponse {
    pub status: String,
    #[serde(default)]
    pub total: u64,
    #[serde(default)]
    pub completed: u64,
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

    pub fn set_base_url(&mut self, url: &str) {
        self.base_url = url.to_string();
    }

    #[allow(dead_code)]
    pub fn base_url(&self) -> &str {
        &self.base_url
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

    pub async fn list_running_models(&self) -> Result<Vec<String>, String> {
        let url = format!("{}/api/ps", self.base_url);
        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to get running models: {}", e))?;

        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let mut names = Vec::new();
        if let Some(models) = body.get("models").and_then(|m| m.as_array()) {
            for m in models {
                if let Some(name) = m.get("name").and_then(|n| n.as_str()) {
                    names.push(name.to_string());
                }
            }
        }
        Ok(names)
    }

    pub async fn load_model(&self, model: &str) -> Result<(), String> {
        let url = format!("{}/api/generate", self.base_url);
        let body = serde_json::json!({
            "model": model,
            "prompt": "",
            "stream": false,
            "keep_alive": "5m",
        });

        let resp = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Failed to load model: {}", e))?;

        let text = resp
            .text()
            .await
            .map_err(|e| format!("Failed to read load response: {}", e))?;

        // Check if Ollama returned an error
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
            if let Some(err) = json.get("error").and_then(|e| e.as_str()) {
                return Err(err.to_string());
            }
        }

        Ok(())
    }

    pub async fn unload_model(&self, model: &str) -> Result<(), String> {
        let url = format!("{}/api/generate", self.base_url);
        let body = serde_json::json!({
            "model": model,
            "prompt": "",
            "stream": false,
            "keep_alive": 0,
        });

        let resp = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Failed to stop model: {}", e))?;

        let text = resp
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
            if let Some(err) = json.get("error").and_then(|e| e.as_str()) {
                return Err(err.to_string());
            }
        }

        Ok(())
    }

    pub async fn fetch_library_models(&self) -> Result<Vec<LibraryModel>, String> {
        let html = self
            .client
            .get("https://ollama.com/library")
            .send()
            .await
            .map_err(|e| format!("Failed to fetch library: {}", e))?
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        let document = Html::parse_document(&html);

        let li_sel = Selector::parse("li").map_err(|e| format!("Selector error: {:?}", e))?;
        let link_sel = Selector::parse("a[href^='/library/']").map_err(|e| format!("Selector error: {:?}", e))?;
        let name_sel = Selector::parse("h2 span.group-hover\\:underline").map_err(|e| format!("Selector error: {:?}", e))?;
        let desc_sel = Selector::parse("p.break-words").map_err(|e| format!("Selector error: {:?}", e))?;
        let pulls_sel = Selector::parse("[x-test-pull-count]").map_err(|e| format!("Selector error: {:?}", e))?;
        let tags_sel = Selector::parse("[x-test-tag-count]").map_err(|e| format!("Selector error: {:?}", e))?;

        let mut models = Vec::new();

        for li in document.select(&li_sel) {
            if let Some(link) = li.select(&link_sel).next() {
                let name = li
                    .select(&name_sel)
                    .next()
                    .map(|el| el.text().collect::<String>().trim().to_string())
                    .unwrap_or_default();

                if name.is_empty() {
                    continue;
                }

                let description = li
                    .select(&desc_sel)
                    .next()
                    .map(|el| el.text().collect::<String>().trim().to_string())
                    .unwrap_or_default();

                let pulls = li
                    .select(&pulls_sel)
                    .next()
                    .map(|el| el.text().collect::<String>().trim().to_string())
                    .unwrap_or_default();

                let tag_count = li
                    .select(&tags_sel)
                    .next()
                    .map(|el| el.text().collect::<String>().trim().to_string())
                    .unwrap_or_default();

                let href = link.value().attr("href").unwrap_or("");
                let url = format!("https://ollama.com{}", href);

                models.push(LibraryModel {
                    name,
                    description,
                    pulls,
                    tag_count,
                    url,
                });
            }
        }

        Ok(models)
    }

    pub async fn pull_model_stream(
        &self,
        model: &str,
    ) -> Result<BoxStream<'static, Result<PullProgressResponse, String>>, reqwest::Error> {
        let url = format!("{}/api/pull", self.base_url);
        let body = serde_json::json!({
            "name": model,
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
                        match serde_json::from_str::<PullProgressResponse>(line) {
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

    pub async fn delete_model(&self, model: &str) -> Result<(), String> {
        let url = format!("{}/api/delete", self.base_url);
        let body = serde_json::json!({ "name": model });
        self.client
            .delete(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn chat_stream(
        &self,
        model: &str,
        messages: &[ChatMessage],
        context_size: Option<u64>,
    ) -> Result<BoxStream<'static, Result<ChatStreamResponse, String>>, reqwest::Error> {
        let url = format!("{}/api/chat", self.base_url);
        let mut body = serde_json::json!({
            "model": model,
            "messages": messages,
            "stream": true,
        });

        if let Some(ctx) = context_size {
            body["options"] = serde_json::json!({ "num_ctx": ctx });
        }

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
