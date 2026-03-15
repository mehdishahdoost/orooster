interface Props {
  connected: boolean;
  checking: boolean;
}

export function StatusIndicator({ connected, checking }: Props) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className={`w-2 h-2 rounded-full ${
          checking
            ? "bg-yellow-400 animate-pulse"
            : connected
            ? "bg-[var(--success)]"
            : "bg-[var(--danger)]"
        }`}
      />
      <span className="text-[var(--text-secondary)]">
        {checking ? "Checking..." : connected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}
