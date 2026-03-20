"use client";

import { useState, useEffect } from "react";
import type { AIAction, AppTab } from "@/lib/aiActions";
import type { Expense, Participant } from "@/lib/types";
import { useAIAction } from "@/hooks/useAIAction";

interface Props {
  participants: Participant[];
  expenses: Expense[];
  /** Called after user confirms an add_participant action. */
  onAddParticipant: (name: string) => void;
  /** Called after user confirms an add_expense action. Caller supplies the id. */
  onAddExpense: (expense: Expense) => void;
  /** Called immediately for switch_tab / settle_up actions. */
  onSwitchTab: (tab: AppTab) => void;
}

type Feedback = { type: "success" | "error"; text: string };

export default function AIInput({
  participants,
  expenses,
  onAddParticipant,
  onAddExpense,
  onSwitchTab,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const { execute, loading } = useAIAction();

  // Auto-clear feedback after 4 s
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const nameById = (id: string) =>
    participants.find((p) => p.id === id)?.name ?? id;

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading || pendingAction) return;

    const action = await execute({ prompt: trimmed, participants, expenses });

    // Immediate actions — no confirmation needed
    if (action.type === "switch_tab") {
      setPrompt("");
      onSwitchTab(action.tab);
      setFeedback({ type: "success", text: `Switched to ${action.tab} tab.` });
      return;
    }

    if (action.type === "settle_up") {
      setPrompt("");
      onSwitchTab("settlement");
      setFeedback({ type: "success", text: "Showing settlement view." });
      return;
    }

    if (action.type === "unknown") {
      setFeedback({ type: "error", text: action.message });
      return;
    }

    // add_participant / add_expense → wait for user confirmation
    setPrompt("");
    setFeedback(null);
    setPendingAction(action);
  };

  // ── Confirm / Dismiss ───────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (!pendingAction) return;

    if (pendingAction.type === "add_participant") {
      onAddParticipant(pendingAction.name);
      setFeedback({
        type: "success",
        text: `Added participant "${pendingAction.name}".`,
      });
    }

    if (pendingAction.type === "add_expense") {
      const { description, amount, currency, paidBy, splitAmong, date } =
        pendingAction;
      onAddExpense({
        id: crypto.randomUUID(),
        description,
        amount,
        currency,
        paidBy,
        splitAmong,
        date,
      });
      setFeedback({
        type: "success",
        text: `Added expense "${pendingAction.description}".`,
      });
    }

    setPendingAction(null);
  };

  const handleDismiss = () => setPendingAction(null);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-lg mb-4 space-y-2">
      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder='e.g. "Alice paid $50 for dinner, split with everyone"'
            disabled={loading || !!pendingAction}
            className="w-full border border-indigo-200 rounded-lg pl-3 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:bg-gray-50 bg-indigo-50/40 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || loading || !!pendingAction}
          className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
          ) : (
            <>
              <span className="text-indigo-200 text-xs">✦</span> Ask AI
            </>
          )}
        </button>
      </div>

      {/* Confirmation card */}
      {pendingAction && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2.5">
          <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">
            Confirm before adding
          </p>
          <ConfirmationBody action={pendingAction} nameById={nameById} />
          <div className="flex gap-2 pt-0.5">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 bg-white rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Inline feedback */}
      {feedback && !pendingAction && (
        <p
          className={`text-xs px-3 py-1.5 rounded-lg ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-red-50 text-red-600 border border-red-100"
          }`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}

// ── Confirmation body ─────────────────────────────────────────────────────────

function ConfirmationBody({
  action,
  nameById,
}: {
  action: AIAction;
  nameById: (id: string) => string;
}) {
  if (action.type === "add_participant") {
    return (
      <p className="text-sm text-gray-700">
        Add participant <strong>{action.name}</strong>?
      </p>
    );
  }

  if (action.type === "add_expense") {
    const splitNames = action.splitAmong.map(nameById).join(", ");
    return (
      <div className="text-sm text-gray-700 space-y-0.5">
        <p className="font-semibold">{action.description}</p>
        <p className="text-gray-500">
          {action.currency} {action.amount.toFixed(2)} · paid by{" "}
          <span className="font-medium text-gray-700">{nameById(action.paidBy)}</span>
        </p>
        <p className="text-gray-500">Split with: {splitNames}</p>
        <p className="text-gray-400 text-xs">{action.date}</p>
      </div>
    );
  }

  return null;
}
