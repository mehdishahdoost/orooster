import { ChevronDown, RefreshCw } from "lucide-react";
import type { ModelInfo } from "../lib/types";

interface Props {
  models: ModelInfo[];
  selectedModel: string;
  onSelect: (model: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export function ModelSelector({
  models,
  selectedModel,
  onSelect,
  onRefresh,
  loading,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={selectedModel}
          onChange={(e) => onSelect(e.target.value)}
          className="appearance-none bg-[var(--bg-secondary)] border border-[var(--border)]
                     rounded-lg px-3 py-1.5 pr-8 text-sm text-[var(--text-primary)]
                     focus:outline-none focus:border-[var(--accent)] cursor-pointer"
        >
          {models.map((model) => (
            <option key={model.name} value={model.name}>
              {model.name} ({formatSize(model.size)})
            </option>
          ))}
          {models.length === 0 && (
            <option disabled>No models found</option>
          )}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          color="var(--text-secondary)"
        />
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors
                   disabled:opacity-50"
        title="Refresh models"
      >
        <RefreshCw
          size={14}
          color="var(--text-secondary)"
          className={loading ? "animate-spin" : ""}
        />
      </button>
    </div>
  );
}
