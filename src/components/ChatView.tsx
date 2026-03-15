import { useEffect, useRef } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { InputBar } from "./InputBar";
import type { ChatMessage } from "../lib/types";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (content: string) => void;
  onClear: () => void;
  connected: boolean;
}

export function ChatView({
  messages,
  isStreaming,
  onSend,
  onClear,
  connected,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--text-secondary)]">
            <MessageCircle size={48} strokeWidth={1.5} />
            <div className="text-center">
              <p className="text-lg font-medium text-[var(--text-primary)]">
                Ollama GUI
              </p>
              <p className="text-sm mt-1">
                Send a message to start a conversation
              </p>
            </div>
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
        <div className="flex justify-center py-1">
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg
                       text-[var(--text-secondary)] hover:text-[var(--danger)]
                       hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Trash2 size={12} />
            Clear chat
          </button>
        </div>
      )}

      <InputBar onSend={onSend} disabled={isStreaming || !connected} />
    </div>
  );
}
