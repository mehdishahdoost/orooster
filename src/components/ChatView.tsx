import { useEffect, useRef, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Trash2, ChevronDown, Play, Loader2, Square } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { InputBar } from "./InputBar";
import type { ChatMessage, ModelInfo } from "../lib/types";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (content: string) => void;
  onClear: () => void;
  connected: boolean;
  models: ModelInfo[];
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export function ChatView({
  messages,
  isStreaming,
  onSend,
  onClear,
  connected,
  models,
  selectedModel,
  onSelectModel,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [modelRunning, setModelRunning] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [stoppingModel, setStoppingModel] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const checkModelRunning = useCallback(async () => {
    if (!connected || !selectedModel) {
      setModelRunning(false);
      return;
    }
    try {
      const running = await invoke<string[]>("list_running");
      const sel = selectedModel.split(":")[0];
      setModelRunning(running.some((r) => r === selectedModel || r.split(":")[0] === sel));
    } catch {
      setModelRunning(false);
    }
  }, [connected, selectedModel]);

  useEffect(() => {
    checkModelRunning();
    const interval = setInterval(checkModelRunning, 5000);
    return () => clearInterval(interval);
  }, [checkModelRunning]);

  const handleStopModel = useCallback(async () => {
    if (!selectedModel || stoppingModel) return;
    setStoppingModel(true);
    setLoadError(null);
    try {
      await invoke("unload_model", { name: selectedModel });
      setModelRunning(false);
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setStoppingModel(false);
      checkModelRunning();
    }
  }, [selectedModel, stoppingModel, checkModelRunning]);

  const handleRunModel = useCallback(async () => {
    if (!selectedModel || loadingModel) return;
    setLoadingModel(true);
    setLoadError(null);
    try {
      await invoke("load_model", { name: selectedModel });
      setModelRunning(true);
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setLoadingModel(false);
      checkModelRunning();
    }
  }, [selectedModel, loadingModel, checkModelRunning]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 px-5 py-2 border-b border-[var(--border)]">
        <span className="text-sm font-medium text-[var(--text-primary)]">Model:</span>
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            className="appearance-none bg-[var(--bg-primary)] border border-[var(--border)]
                       rounded-lg px-3 py-1.5 pr-8 text-sm text-[var(--text-primary)]
                       focus:outline-none focus:border-[var(--accent)] cursor-pointer"
          >
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
            {models.length === 0 && (
              <option disabled>No models</option>
            )}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            color="var(--text-secondary)"
          />
        </div>
        {connected && selectedModel && (
          modelRunning ? (
            <button
              onClick={handleStopModel}
              disabled={stoppingModel}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg
                         text-[var(--danger)] border border-[var(--danger)] hover:bg-red-50
                         disabled:opacity-50 transition-colors"
            >
              {stoppingModel ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <Square size={12} />
                  Stop
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleRunModel}
              disabled={loadingModel}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg
                         bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]
                         disabled:opacity-50 transition-colors"
            >
              {loadingModel ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Play size={14} />
                  Run
                </>
              )}
            </button>
          )
        )}
        {loadError && (
          <span className="text-xs text-[var(--danger)] ml-auto truncate max-w-[50%]" title={loadError}>
            {loadError}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[var(--bg-secondary)]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-sm text-[var(--accent-light)]">
              Start a conversation with Ollama
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-4 space-y-1">
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {messages.length > 0 && !isStreaming && (
        <div className="flex justify-center py-1 bg-[var(--bg-secondary)]">
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg
                       text-[var(--text-secondary)] hover:text-[var(--danger)]
                       hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <Trash2 size={12} />
            Clear chat
          </button>
        </div>
      )}

      <InputBar onSend={onSend} disabled={isStreaming || !connected || !modelRunning} connected={connected} modelRunning={modelRunning} />
    </div>
  );
}
