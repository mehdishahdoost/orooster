import { useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
  connected?: boolean;
  modelRunning?: boolean;
}

export function InputBar({ onSend, disabled, connected, modelRunning }: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    },
    []
  );

  const placeholder = connected === false
    ? "Connect to Ollama first"
    : modelRunning === false
      ? "Run the model first"
      : "Type a message...";

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-primary)] px-5 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--input-bg)]
                     px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]
                     focus:outline-none focus:border-[var(--accent)] transition-colors
                     disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--bg-tertiary)]
                     hover:bg-[var(--accent)] hover:text-white
                     disabled:opacity-40 disabled:cursor-not-allowed
                     flex items-center justify-center transition-colors"
        >
          <Send size={18} color="var(--text-secondary)" />
        </button>
      </div>
    </div>
  );
}
