import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { User, Bot, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import type { ChatMessage } from "../lib/types";

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  return (
    <div
      className={`flex gap-3 px-4 py-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-[var(--user-bubble)]"
            : "bg-[var(--bg-tertiary)]"
        }`}
      >
        {isUser ? (
          <User size={16} color="var(--user-text)" />
        ) : (
          <Bot size={16} color="var(--text-primary)" />
        )}
      </div>

      <div
        className={`group relative max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-[var(--user-bubble)] text-[var(--user-text)]"
            : "bg-[var(--assistant-bubble)] text-[var(--assistant-text)]"
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <div className="markdown-body text-sm leading-relaxed">
            {message.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {message.content}
              </ReactMarkdown>
            ) : isStreaming ? (
              <div className="flex gap-1 py-1">
                <span className="typing-dot w-2 h-2 rounded-full bg-[var(--text-secondary)]" />
                <span className="typing-dot w-2 h-2 rounded-full bg-[var(--text-secondary)]" />
                <span className="typing-dot w-2 h-2 rounded-full bg-[var(--text-secondary)]" />
              </div>
            ) : null}
          </div>
        )}

        {!isUser && message.content && !isStreaming && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-6 right-0 opacity-0 group-hover:opacity-100 transition-opacity
                       p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--border)]"
            title="Copy message"
          >
            {copied ? (
              <Check size={12} color="var(--success)" />
            ) : (
              <Copy size={12} color="var(--text-secondary)" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
