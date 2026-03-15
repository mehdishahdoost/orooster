import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ModelInfo } from "../lib/types";

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ModelInfo[]>("list_models");
      setModels(result);
      if (result.length > 0 && !selectedModel) {
        setSelectedModel(result[0].name);
      }
    } catch (e) {
      setError(`Failed to fetch models: ${e}`);
    } finally {
      setLoading(false);
    }
  }, [selectedModel]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, selectedModel, setSelectedModel, loading, error, fetchModels };
}
