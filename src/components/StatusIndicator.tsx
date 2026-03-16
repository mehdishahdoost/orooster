interface Props {
  connected: boolean;
  checking: boolean;
}

export function StatusIndicator({ connected, checking }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-primary)]">
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          checking
            ? "bg-yellow-400 animate-pulse"
            : connected
            ? "bg-[var(--success)]"
            : "bg-[var(--danger)]"
        }`}
      />
      <span className="text-xs font-medium text-[var(--text-primary)]">
        Ollama: {checking ? "Checking..." : connected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}
