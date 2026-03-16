import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useChat } from "./hooks/useChat";
import { useModels } from "./hooks/useModels";
import { useConnection } from "./hooks/useConnection";
import { useSettings } from "./hooks/useSettings";
import { usePullModel } from "./hooks/usePullModel";
import { Header } from "./components/Header";
import { TabNav } from "./components/TabNav";
import { ChatView } from "./components/ChatView";
import { ModelsView } from "./components/ModelsView";
import { SettingsView } from "./components/SettingsView";
import type { TabId } from "./lib/types";

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const { messages, isStreaming, sendMessage, clearMessages } = useChat();
  const { models, selectedModel, setSelectedModel, fetchModels } = useModels();
  const { connected, checking } = useConnection();
  const { settings, saving, saveSettings } = useSettings();
  const { pulling, pullProgress, pullModel } = usePullModel(fetchModels);

  const handleSend = (content: string) => {
    sendMessage(content, selectedModel);
  };

  const handleDeleteModel = useCallback(
    async (name: string) => {
      try {
        await invoke("delete_model", { name });
        fetchModels();
      } catch (e) {
        console.error("Failed to delete model:", e);
      }
    },
    [fetchModels]
  );

  return (
    <div className="flex flex-col h-screen">
      <Header connected={connected} checking={checking} />
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "chat" && (
        <ChatView
          messages={messages}
          isStreaming={isStreaming}
          onSend={handleSend}
          onClear={clearMessages}
          connected={connected}
          models={models}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
        />
      )}

      {activeTab === "models" && (
        <ModelsView
          models={models}
          connected={connected}
          onPull={pullModel}
          onDelete={handleDeleteModel}
          pulling={pulling}
          pullProgress={pullProgress}
          onRefresh={fetchModels}
        />
      )}

      {activeTab === "settings" && (
        <SettingsView
          settings={settings}
          onSave={saveSettings}
          saving={saving}
        />
      )}
    </div>
  );
}

export default App;
