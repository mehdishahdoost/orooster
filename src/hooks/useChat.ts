import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ChatMessage, ChatTokenEvent } from "../lib/types";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamContentRef = useRef("");

  const sendMessage = useCallback(
    async (content: string, model: string) => {
      if (!content.trim() || isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      const assistantMessage: ChatMessage = { role: "assistant", content: "" };
      setMessages([...newMessages, assistantMessage]);
      setIsStreaming(true);
      streamContentRef.current = "";

      let unlistenToken: UnlistenFn | undefined;
      let unlistenError: UnlistenFn | undefined;

      try {
        unlistenToken = await listen<ChatTokenEvent>(
          "chat-token",
          (event) => {
            streamContentRef.current += event.payload.content;
            const updatedContent = streamContentRef.current;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: updatedContent,
              };
              return updated;
            });

            if (event.payload.done) {
              setIsStreaming(false);
            }
          }
        );

        unlistenError = await listen<string>("chat-error", (event) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: `Error: ${event.payload}`,
            };
            return updated;
          });
          setIsStreaming(false);
        });

        await invoke("chat_stream", {
          request: {
            model,
            messages: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
        });
      } catch (error) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${error}`,
          };
          return updated;
        });
        setIsStreaming(false);
      } finally {
        unlistenToken?.();
        unlistenError?.();
      }
    },
    [messages, isStreaming]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, clearMessages };
}
