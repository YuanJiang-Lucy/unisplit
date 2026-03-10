"use client";

import { useState } from "react";
import { Expense, Participant, PARTICIPANT_COLORS } from "@/lib/types";

interface Props {
  participants: Participant[];
  expenses: Expense[];
  onChange: (participants: Participant[]) => void;
  onExpensesChange: (expenses: Expense[]) => void;
}

export default function ParticipantsPanel({
  participants,
  expenses,
  onChange,
  onExpensesChange,
}: Props) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const addParticipant = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;

    const color = PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length];
    onChange([...participants, { id: crypto.randomUUID(), name: trimmed, color }]);
    setName("");
  };

  const startEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditingName(p.name);
  };

  const saveEdit = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    if (
      participants.some(
        (p) => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase()
      )
    )
      return;
    onChange(participants.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const removeParticipant = (id: string) => {
    const affectedCount = expenses.filter(
      (e) => e.paidBy === id || e.splitAmong.includes(id)
    ).length;

    if (
      affectedCount > 0 &&
      !confirm(
        `Removing this participant will also delete ${affectedCount} expense(s) that involve them. Continue?`
      )
    )
      return;

    onChange(participants.filter((p) => p.id !== id));
    // Drop expenses that reference the deleted participant
    onExpensesChange(
      expenses.filter((e) => e.paidBy !== id && !e.splitAmong.includes(id))
    );
  };

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Participant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addParticipant()}
          maxLength={30}
        />
        <button
          onClick={addParticipant}
          disabled={!name.trim()}
          className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Add
        </button>
      </div>

      {participants.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Add at least two participants to get started.
        </p>
      )}

      <ul className="space-y-2">
        {participants.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 gap-2"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              {editingId === p.id ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    autoFocus
                    type="text"
                    className="flex-1 min-w-0 border border-indigo-400 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(p.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    maxLength={30}
                  />
                  <button
                    onClick={() => saveEdit(p.id)}
                    className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span
                  className="text-sm font-medium text-gray-700 cursor-pointer hover:text-indigo-600 truncate"
                  onClick={() => startEdit(p)}
                  title="Click to edit"
                >
                  {p.name}
                </span>
              )}
            </div>

            {editingId !== p.id && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => startEdit(p)}
                  className="text-gray-400 hover:text-indigo-500 transition-colors text-sm"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={() => removeParticipant(p.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
