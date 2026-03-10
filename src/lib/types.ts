export interface Participant {
  id: string;
  name: string;
  color: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string; // participant id
  splitAmong: string[]; // participant ids
  date: string; // ISO date string
}

export interface Settlement {
  from: string; // participant id
  to: string;   // participant id
  amount: number;
  currency: string;
}

export const CURRENCIES = ["USD", "EUR", "GBP", "CNY", "JPY", "AUD", "CAD", "SGD", "KRW"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PARTICIPANT_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // violet
  "#14b8a6", // teal
];
