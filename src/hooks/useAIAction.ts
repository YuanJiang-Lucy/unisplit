"use client";

import { useState, useCallback } from "react";
import type { AIAction } from "@/lib/aiActions";
import type { Participant, Expense } from "@/lib/types";

interface ExecuteOptions {
  prompt: string;
  participants: Participant[];
  expenses: Expense[];
}

interface UseAIActionResult {
  execute: (options: ExecuteOptions) => Promise<AIAction>;
  loading: boolean;
}

export function useAIAction(): UseAIActionResult {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async ({ prompt, participants, expenses }: ExecuteOptions): Promise<AIAction> => {
      setLoading(true);
      try {
        const res = await fetch("/api/ai-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, participants, expenses }),
        });

        const data = (await res.json()) as { action?: AIAction; error?: string };

        if (!res.ok || data.error) {
          const message = data.error ?? `Request failed (${res.status})`;
          return { type: "unknown", message };
        }

        if (!data.action) {
          return { type: "unknown", message: "No action returned from server." };
        }

        return data.action;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Network error. Check your connection.";
        return { type: "unknown", message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { execute, loading };
}
