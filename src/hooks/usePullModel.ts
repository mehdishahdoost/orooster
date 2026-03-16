import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { PullProgressEvent } from "../lib/types";

export function usePullModel(onComplete?: () => void) {
  const [pulling, setPulling] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState<{
    status: string;
    percent: number;
  } | null>(null);

  const unlistenRef = useRef<{ progress?: UnlistenFn; error?: UnlistenFn }>({});

  const pullModel = useCallback(
    async (name: string) => {
      if (pulling) return;

      setPulling(name);
      setPullProgress(null);

      try {
        unlistenRef.current.progress = await listen<PullProgressEvent>(
          "pull-progress",
          (event) => {
            const { status, total, completed, done } = event.payload;
            const percent =
              total > 0 ? Math.round((completed / total) * 100) : 0;
            setPullProgress({ status, percent });

            if (done) {
              setPulling(null);
              setPullProgress(null);
              onComplete?.();
            }
          }
        );

        unlistenRef.current.error = await listen<string>(
          "pull-error",
          () => {
            setPulling(null);
            setPullProgress(null);
          }
        );

        await invoke("pull_model", { name });
      } catch {
        setPulling(null);
        setPullProgress(null);
      } finally {
        unlistenRef.current.progress?.();
        unlistenRef.current.error?.();
      }
    },
    [pulling, onComplete]
  );

  return { pulling, pullProgress, pullModel };
}
