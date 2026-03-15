import { useChat } from "./hooks/useChat";
import { useModels } from "./hooks/useModels";
import { useConnection } from "./hooks/useConnection";
import { ChatView } from "./components/ChatView";
import { ModelSelector } from "./components/ModelSelector";
import { StatusIndicator } from "./components/StatusIndicator";

function App() {
  const { messages, isStreaming, sendMessage, clearMessages } = useChat();
  const { models, selectedModel, setSelectedModel, loading, fetchModels } =
    useModels();
  const { connected, checking } = useConnection();

  const handleSend = (content: string) => {
    sendMessage(content, selectedModel);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">
            Ollama GUI
          </h1>
          <StatusIndicator connected={connected} checking={checking} />
        </div>
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onSelect={setSelectedModel}
          onRefresh={fetchModels}
          loading={loading}
        />
      </header>

      {/* Chat */}
      <ChatView
        messages={messages}
        isStreaming={isStreaming}
        onSend={handleSend}
        onClear={clearMessages}
        connected={connected}
      />
    </div>
  );
}

export default App;
