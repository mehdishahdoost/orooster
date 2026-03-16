import { useState, useEffect } from "react";
import { Monitor, Box, Info, Save } from "lucide-react";
import type { AppSettings } from "../lib/types";

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  saving: boolean;
}

export function SettingsView({ settings, onSave, saving }: Props) {
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollama_url);
  const [contextSize, setContextSize] = useState(settings.context_size);

  useEffect(() => {
    setOllamaUrl(settings.ollama_url);
    setContextSize(settings.context_size);
  }, [settings]);

  const handleSave = () => {
    onSave({
      ollama_url: ollamaUrl,
      context_size: contextSize,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--bg-secondary)]">
      <div className="max-w-2xl mx-auto py-6 px-5 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Settings</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Configure ORooster and Ollama connection
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4"
             style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="flex items-center gap-2">
            <Monitor size={18} className="text-[var(--text-primary)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Ollama Connection</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Configure the connection to your Ollama instance
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">
              Ollama API URL
            </label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)]
                         bg-[var(--input-bg)] text-[var(--text-primary)]
                         focus:outline-none focus:border-[var(--accent)]"
            />
            <p className="text-xs text-[var(--text-muted)]">
              The default Ollama API endpoint is http://localhost:11434
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4"
             style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="flex items-center gap-2">
            <Box size={18} className="text-[var(--text-primary)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Model Parameters</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Configure model behavior and performance
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Context Size
              </label>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {contextSize}
              </span>
            </div>
            <input
              type="range"
              min={512}
              max={32768}
              step={512}
              value={contextSize}
              onChange={(e) => setContextSize(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-[var(--text-muted)]">
              Context window size (tokens). Higher values allow longer conversations but use more memory. Common values: 2048, 4096, 8192
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                       bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-medium
                       hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-4"
             style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="flex items-center gap-2">
            <Info size={18} className="text-[var(--text-primary)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">About ORooster</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Application information</p>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-[var(--text-primary)]">Version</span>
              <span className="text-sm text-[var(--text-secondary)]">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-[var(--text-primary)]">Platform</span>
              <span className="text-sm text-[var(--accent-light)]">Ubuntu Desktop</span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            ORooster is a desktop wrapper for Ollama, providing an easy-to-use interface for interacting with local language models.
          </p>
        </div>
      </div>
    </div>
  );
}
