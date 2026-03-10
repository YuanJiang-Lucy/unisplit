"use client";

import { useState, useEffect } from "react";
import { Expense, Participant, CURRENCIES } from "@/lib/types";

interface Props {
  participants: Participant[];
  expenses: Expense[];
  onChange: (expenses: Expense[]) => void;
}

const DEFAULT_CURRENCY = "USD";

interface FormState {
  description: string;
  amount: string;
  currency: string;
  paidBy: string;
  splitAmong: string[];
  date: string;
}

function buildInitialForm(participants: Participant[], base?: Expense): FormState {
  return {
    description: base?.description ?? "",
    amount: base ? String(base.amount) : "",
    currency: base?.currency ?? DEFAULT_CURRENCY,
    paidBy: base?.paidBy ?? participants[0]?.id ?? "",
    splitAmong: base?.splitAmong ?? participants.map((p) => p.id),
    date: base?.date ?? new Date().toISOString().slice(0, 10),
  };
}

function ExpenseForm({
  participants,
  initialValues,
  mode,
  onSave,
  onCancel,
}: {
  participants: Participant[];
  initialValues?: Expense;
  mode: "add" | "edit";
  onSave: (e: Expense) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    buildInitialForm(participants, initialValues)
  );

  // Keep paidBy and splitAmong valid when participants list changes
  useEffect(() => {
    const ids = participants.map((p) => p.id);
    setForm((prev) => ({
      ...prev,
      paidBy: ids.includes(prev.paidBy) ? prev.paidBy : (ids[0] ?? ""),
      splitAmong: prev.splitAmong.filter((id) => ids.includes(id)),
    }));
  }, [participants]);

  const toggleSplit = (id: string) => {
    setForm((prev) => ({
      ...prev,
      splitAmong: prev.splitAmong.includes(id)
        ? prev.splitAmong.filter((x) => x !== id)
        : [...prev.splitAmong, id],
    }));
  };

  const isValid =
    form.description.trim() !== "" &&
    parseFloat(form.amount) > 0 &&
    form.paidBy !== "" &&
    form.splitAmong.length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onSave({
      id: initialValues?.id ?? crypto.randomUUID(),
      description: form.description.trim(),
      amount: Math.round(parseFloat(form.amount) * 100) / 100,
      currency: form.currency,
      paidBy: form.paidBy,
      splitAmong: form.splitAmong,
      date: form.date,
    });
    if (mode === "add") {
      setForm(buildInitialForm(participants));
    }
  };

  if (participants.length < 2) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        Add at least two participants first.
      </p>
    );
  }

  return (
    <div className="space-y-3 bg-gray-50 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
        {mode === "edit" ? "Edit Expense" : "New Expense"}
      </h3>

      <input
        type="text"
        placeholder="Description (e.g. Dinner)"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={form.description}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        maxLength={60}
      />

      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Amount"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={form.amount}
          onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
          min="0"
          step="0.01"
        />
        <select
          className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          value={form.currency}
          onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Paid by</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            value={form.paidBy}
            onChange={(e) => setForm((p) => ({ ...p, paidBy: e.target.value }))}
          >
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Date</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Split among</label>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleSplit(p.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.splitAmong.includes(p.id)
                  ? "text-white border-transparent"
                  : "bg-white text-gray-500 border-gray-300"
              }`}
              style={
                form.splitAmong.includes(p.id)
                  ? { backgroundColor: p.color, borderColor: p.color }
                  : {}
              }
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {mode === "edit" ? "Update Expense" : "Add Expense"}
        </button>
        {mode === "edit" && onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function ExpensesPanel({ participants, expenses, onChange }: Props) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleAdd = (e: Expense) => onChange([...expenses, e]);

  const handleUpdate = (updated: Expense) => {
    onChange(expenses.map((e) => (e.id === updated.id ? updated : e)));
    setEditingExpense(null);
  };

  const removeExpense = (id: string) => onChange(expenses.filter((e) => e.id !== id));

  const participantMap = Object.fromEntries(participants.map((p) => [p.id, p]));
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      {editingExpense ? (
        <ExpenseForm
          participants={participants}
          initialValues={editingExpense}
          mode="edit"
          onSave={handleUpdate}
          onCancel={() => setEditingExpense(null)}
        />
      ) : (
        <ExpenseForm
          participants={participants}
          mode="add"
          onSave={handleAdd}
        />
      )}

      {expenses.length === 0 && participants.length >= 2 && (
        <p className="text-sm text-gray-400 text-center py-2">No expenses yet.</p>
      )}

      <ul className="space-y-2">
        {sorted.map((expense) => {
          const payer = participantMap[expense.paidBy];
          const splitNames = expense.splitAmong
            .map((id) => participantMap[id]?.name ?? "?")
            .join(", ");
          const isEditing = editingExpense?.id === expense.id;

          return (
            <li
              key={expense.id}
              className={`bg-white border rounded-xl p-3 flex items-start justify-between gap-2 transition-colors ${
                isEditing ? "border-indigo-300 ring-1 ring-indigo-200" : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-2 mt-1 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: payer?.color ?? "#999" }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {expense.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-medium" style={{ color: payer?.color }}>
                      {payer?.name ?? "?"}
                    </span>{" "}
                    paid &middot; split with {splitNames}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{expense.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-bold text-gray-800">
                  {expense.currency} {expense.amount.toFixed(2)}
                </span>
                <button
                  onClick={() =>
                    setEditingExpense(isEditing ? null : expense)
                  }
                  className={`transition-colors text-sm ${
                    isEditing
                      ? "text-indigo-500"
                      : "text-gray-400 hover:text-indigo-500"
                  }`}
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={() => {
                    if (isEditing) setEditingExpense(null);
                    removeExpense(expense.id);
                  }}
                  className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
