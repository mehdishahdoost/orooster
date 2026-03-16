import { StatusIndicator } from "./StatusIndicator";

interface Props {
  connected: boolean;
  checking: boolean;
}

export function Header({ connected, checking }: Props) {
  return (
    <header className="flex items-center justify-between px-5 py-3 bg-[var(--bg-primary)]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--text-primary)] flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">
            ORooster
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Ollama Desktop Wrapper
          </p>
        </div>
      </div>
      <StatusIndicator connected={connected} checking={checking} />
    </header>
  );
}
