import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Search, Download, Trash2, Loader2, RefreshCw } from "lucide-react";
import type { ModelInfo, ModelsSubTab, LibraryModel } from "../lib/types";

interface Props {
  models: ModelInfo[];
  connected: boolean;
  onPull: (name: string) => void;
  onDelete: (name: string) => void;
  pulling: string | null;
  pullProgress: { status: string; percent: number } | null;
  onRefresh: () => void;
}

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export function ModelsView({
  models,
  connected,
  onPull,
  onDelete,
  pulling,
  pullProgress,
  onRefresh,
}: Props) {
  const [subTab, setSubTab] = useState<ModelsSubTab>("available");
  const [search, setSearch] = useState("");
  const [libraryModels, setLibraryModels] = useState<LibraryModel[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const fetchLibrary = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const result = await invoke<LibraryModel[]>("fetch_library");
      setLibraryModels(result);
    } catch (e) {
      setLibraryError(`Failed to fetch models: ${e}`);
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const filteredLibrary = libraryModels.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInstalled = models.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const installedNames = models.map((m) => m.name.split(":")[0]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <button
          onClick={() => setSubTab("available")}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors rounded-t-lg
            ${
              subTab === "available"
                ? "border border-[var(--border)] border-b-transparent bg-[var(--bg-primary)] text-[var(--text-primary)]"
                : "border border-transparent bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            }`}
        >
          Available Models
        </button>
        <button
          onClick={() => {
            setSubTab("installed");
            onRefresh();
          }}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors rounded-t-lg
            ${
              subTab === "installed"
                ? "border border-[var(--border)] border-b-transparent bg-[var(--bg-primary)] text-[var(--text-primary)]"
                : "border border-transparent bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            }`}
        >
          Installed ({models.length})
        </button>
      </div>

      <div className="flex items-center gap-2 px-5 py-2 border-b border-[var(--border)]">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)]
                       bg-[var(--input-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)]
                       focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        {subTab === "available" && (
          <button
            onClick={fetchLibrary}
            disabled={libraryLoading}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
            title="Refresh library"
          >
            <RefreshCw
              size={16}
              className={`text-[var(--text-secondary)] ${libraryLoading ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-[var(--bg-secondary)]">
        {subTab === "available" ? (
          libraryLoading && libraryModels.length === 0 ? (
            <div className="flex items-center justify-center h-full gap-2">
              <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
              <p className="text-sm text-[var(--text-secondary)]">
                Loading models from ollama.com...
              </p>
            </div>
          ) : libraryError ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <p className="text-sm text-[var(--danger)]">{libraryError}</p>
              <button
                onClick={fetchLibrary}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filteredLibrary.map((model) => {
                const isInstalled = installedNames.includes(model.name);
                const isPulling = pulling === model.name;
                return (
                  <div
                    key={model.name}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {model.name}
                        </p>
                        <span className="text-xs text-[var(--text-muted)]">
                          {model.pulls} Pulls
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {model.tag_count} Tags
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {model.description}
                      </p>
                    </div>
                    {isPulling ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Loader2
                          size={16}
                          className="animate-spin text-[var(--accent)]"
                        />
                        <span className="text-xs text-[var(--text-secondary)]">
                          {pullProgress
                            ? `${pullProgress.status} ${pullProgress.percent > 0 ? `${pullProgress.percent}%` : ""}`
                            : "Starting..."}
                        </span>
                      </div>
                    ) : isInstalled ? (
                      <span className="text-xs text-[var(--success)] font-medium px-2 py-1 rounded bg-green-50 flex-shrink-0">
                        Installed
                      </span>
                    ) : (
                      <button
                        onClick={() => onPull(model.name)}
                        disabled={pulling !== null || !connected}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                                   bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]
                                   disabled:opacity-50 transition-colors flex-shrink-0"
                      >
                        <Download size={14} />
                        Pull
                      </button>
                    )}
                  </div>
                );
              })}
              {filteredLibrary.length === 0 && !libraryLoading && (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-[var(--text-secondary)]">
                    No models match your search
                  </p>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredInstalled.map((model) => (
              <div
                key={model.name}
                className="flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {model.name}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatSize(model.size)} · Modified{" "}
                    {new Date(model.modified_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(model.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                             text-[var(--danger)] border border-[var(--danger)] hover:bg-red-50
                             transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            ))}
            {filteredInstalled.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-[var(--text-secondary)]">
                  {models.length === 0
                    ? "No models installed"
                    : "No models match your search"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
