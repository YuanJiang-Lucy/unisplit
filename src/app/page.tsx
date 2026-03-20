"use client";

import { useState } from "react";
import { Expense, Participant } from "@/lib/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import ParticipantsPanel from "@/components/ParticipantsPanel";
import ExpensesPanel from "@/components/ExpensesPanel";
import SettlementPanel from "@/components/SettlementPanel";
import UniBear from "@/components/UniBear";
import AIInput from "@/components/AIInput";
import { calculateSettlements } from "@/lib/settlement";
import { PARTICIPANT_COLORS } from "@/lib/types";
import type { AppTab } from "@/lib/aiActions";

type Tab = "participants" | "expenses" | "settlement";

const TABS: { id: Tab; label: string }[] = [
  { id: "participants", label: "Participants" },
  { id: "expenses", label: "Expenses" },
  { id: "settlement", label: "Settlement" },
];

const SAMPLE_PARTICIPANTS: Participant[] = [
  { id: "sp1", name: "Alice",  color: "#6366f1" },
  { id: "sp2", name: "Liang",  color: "#ec4899" },
  { id: "sp3", name: "Yuki",   color: "#f59e0b" },
  { id: "sp4", name: "Sofia",  color: "#10b981" },
];

const SAMPLE_EXPENSES: Expense[] = [
  { id: "se1", description: "Group dinner",        amount: 120,  currency: "USD", paidBy: "sp1", splitAmong: ["sp1","sp2","sp3","sp4"], date: "2026-03-01" },
  { id: "se2", description: "Train tickets",       amount: 800,  currency: "CNY", paidBy: "sp2", splitAmong: ["sp1","sp2","sp3","sp4"], date: "2026-03-02" },
  { id: "se3", description: "Museum entry",        amount: 45,   currency: "EUR", paidBy: "sp4", splitAmong: ["sp1","sp2","sp3","sp4"], date: "2026-03-03" },
  { id: "se4", description: "Convenience store",   amount: 2400, currency: "JPY", paidBy: "sp3", splitAmong: ["sp1","sp3"],             date: "2026-03-04" },
  { id: "se5", description: "Hotpot night",        amount: 320,  currency: "CNY", paidBy: "sp2", splitAmong: ["sp1","sp2","sp4"],       date: "2026-03-05" },
  { id: "se6", description: "Coffee & snacks",     amount: 28,   currency: "USD", paidBy: "sp1", splitAmong: ["sp1","sp3","sp4"],       date: "2026-03-06" },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("participants");
  const [participants, setParticipants, hydratedP] = useLocalStorage<Participant[]>(
    "unisplit_participants",
    []
  );
  const [expenses, setExpenses, hydratedE] = useLocalStorage<Expense[]>(
    "unisplit_expenses",
    []
  );
  const [paidSettlements, setPaidSettlements, hydratedPS] = useLocalStorage<string[]>(
    "unisplit_paid_settlements",
    []
  );

  const handleReset = () => {
    if (confirm("Reset all data? This cannot be undone.")) {
      setParticipants([]);
      setExpenses([]);
      setPaidSettlements([]);
      setActiveTab("participants");
    }
  };

  const handleLoadSample = () => {
    if (
      participants.length === 0 ||
      confirm("This will replace your current data with sample data. Continue?")
    ) {
      setParticipants(SAMPLE_PARTICIPANTS);
      setExpenses(SAMPLE_EXPENSES);
      setPaidSettlements([]);
      setActiveTab("expenses");
    }
  };

  const handleTogglePaid = (key: string) => {
    setPaidSettlements((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  if (!hydratedP || !hydratedE || !hydratedPS) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  const validExpenses = expenses;

  return (
    <>
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4">
      {/* Header */}
      <header className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600 tracking-tight">UniSplit</h1>
            <p className="text-xs text-gray-500 mt-0.5">Expense splitting for international students</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors border border-indigo-100 hover:border-indigo-300 bg-indigo-50/60 rounded-lg px-3 py-1.5"
            >
              Load sample
            </button>
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors border border-gray-200 rounded-lg px-3 py-1.5"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* AI input */}
      <AIInput
        participants={participants}
        expenses={validExpenses}
        onAddParticipant={(name) => {
          if (participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
          const color = PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length];
          setParticipants([...participants, { id: crypto.randomUUID(), name, color }]);
        }}
        onAddExpense={(expense) => setExpenses([...expenses, expense])}
        onSwitchTab={(tab: AppTab) => setActiveTab(tab)}
      />

      {/* Settlement overview card */}
      {(() => {
        const allSettlements = calculateSettlements(participants, validExpenses);
        const hasData = allSettlements.length > 0;
        const paying   = hasData ? new Set(allSettlements.map((s) => s.from)).size : null;
        const receiving = hasData ? new Set(allSettlements.map((s) => s.to)).size : null;
        const transfers = hasData ? allSettlements.length : null;

        const metrics = [
          { value: paying,    label: "Paying" },
          { value: receiving, label: "Receiving" },
          { value: transfers, label: "Transfers" },
        ];

        return (
          <div className="w-full max-w-lg mb-4 bg-white rounded-2xl shadow-sm px-6 py-3.5 flex items-center justify-between">
            {metrics.map((m, i) => (
              <div key={m.label} className="flex items-center gap-3">
                <div className="text-center">
                  <p className={`text-2xl font-bold leading-none ${m.value !== null ? "text-gray-800" : "text-gray-300"}`}>
                    {m.value ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{m.label}</p>
                </div>
                {i < metrics.length - 1 && (
                  <span className="text-gray-200 text-lg select-none mx-1">·</span>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-sm font-medium py-3 transition-colors ${
                activeTab === tab.id
                  ? "text-indigo-600 border-b-2 border-indigo-500 -mb-px bg-indigo-50/50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.id === "expenses" && validExpenses.length > 0 && (
                <span className="ml-1.5 text-xs bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5">
                  {validExpenses.length}
                </span>
              )}
              {tab.id === "participants" && participants.length > 0 && (
                <span className="ml-1.5 text-xs bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5">
                  {participants.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="p-4">
          {activeTab === "participants" && (
            <ParticipantsPanel
              participants={participants}
              expenses={validExpenses}
              onChange={setParticipants}
              onExpensesChange={setExpenses}
            />
          )}
          {activeTab === "expenses" && (
            <ExpensesPanel
              participants={participants}
              expenses={validExpenses}
              onChange={setExpenses}
            />
          )}
          {activeTab === "settlement" && (
            <SettlementPanel
              participants={participants}
              expenses={validExpenses}
              paidSettlements={paidSettlements}
              onTogglePaid={handleTogglePaid}
            />
          )}
        </div>
      </div>

      <footer className="mt-8 text-xs text-gray-400">
        Data stored locally in your browser &middot; No account needed
      </footer>
    </div>

    <UniBear />
    </>
  );
}
