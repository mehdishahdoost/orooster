import { MessageSquare, Box, Settings } from "lucide-react";
import type { TabId } from "../lib/types";

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: typeof MessageSquare }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "models", label: "Models", icon: Box },
  { id: "settings", label: "Settings", icon: Settings },
];

export function TabNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="flex border-b border-[var(--border)] bg-[var(--bg-primary)] px-5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium transition-colors
              ${
                isActive
                  ? "border border-[var(--border)] border-b-transparent rounded-t-lg -mb-px bg-[var(--bg-primary)] text-[var(--text-primary)]"
                  : "border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }
            `}
            style={{ minWidth: "140px" }}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
