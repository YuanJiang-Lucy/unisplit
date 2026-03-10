# UniSplit — Todo (Next Iteration)

Tasks are ordered by priority. Each entry includes the affected files and enough detail to implement without further research.

---

## P1 — Must Have

### 1. Mark settlement as paid
Users need to track which suggested transactions have actually happened. Without this, the Settlement tab is read-only and offers no workflow value after the math is done.

- Add a `paidSettlements: string[]` list to localStorage (keyed by a stable hash of `from + to + amount + currency`)
- Render a checkbox or "Mark paid" button on each settlement row in `SettlementPanel`
- Paid rows move to a collapsed "Completed" section and are excluded from the balance recalculation
- **Files:** `src/lib/types.ts`, `src/components/SettlementPanel.tsx`, `src/app/page.tsx`

---

### 2. Unequal splits
Equal splitting is rarely accurate for real expenses (e.g. someone orders more, hotel rooms differ). This is the most common complaint about splitting apps.

- Extend `Expense` with a `splitMode: "equal" | "amount" | "percent"` field and a `customShares: Record<string, number>` map
- In `ExpenseForm`, add a toggle after "Split among": Equal / By amount / By percent
- When not equal, render a numeric input per selected participant; validate that amounts/percentages sum correctly before allowing submit
- Settlement algorithm already works on raw per-person share amounts — update `calculateSettlements` to consume `customShares` when present
- **Files:** `src/lib/types.ts`, `src/lib/settlement.ts`, `src/components/ExpensesPanel.tsx`

---

### 3. Multiple groups (trip management)
International students typically have several concurrent contexts: shared flat, a weekend trip, a class project. Right now all expenses are one flat list.

- Add a `Group { id, name, createdAt }` type and store `unisplit_groups` + `unisplit_active_group` in localStorage
- Gate `participants` and `expenses` keys per group: `unisplit_participants_{groupId}`, `unisplit_expenses_{groupId}`
- Add a group switcher in the header (dropdown or slide-out drawer) with New Group / Rename / Delete actions
- **Files:** `src/lib/types.ts`, `src/hooks/useLocalStorage.ts`, `src/app/page.tsx`, `src/components/` (new `GroupSwitcher.tsx`)

---

## P2 — Should Have

### 4. Export and import data
Users lose everything if they clear their browser storage. Sharing a session with a friend currently requires manual re-entry.

- **Export**: serialize current group state to JSON and trigger a `<a download>` click — no dependencies needed
- **Import**: accept a `.json` file via `<input type="file">`, validate schema, merge or replace current state
- **Share link** (stretch): base64-encode the JSON and append as a URL hash; recipient's browser decodes it on load
- Add an Export / Import button in the header or a settings drawer
- **Files:** `src/app/page.tsx`, new `src/lib/exportImport.ts`

---

### 5. Undo delete (toast)
Deletions are permanent with no recovery path. A short-lived undo toast is the standard pattern and requires no extra storage.

- Keep a `deletedSnapshot: { participants, expenses } | null` in component state (not localStorage)
- After any delete, show a fixed-position toast: "Deleted. Undo" with a 5-second countdown
- Clicking Undo restores the snapshot; toast dismisses automatically after the timer
- **Files:** `src/app/page.tsx`, new `src/components/UndoToast.tsx`

---

### 6. Expense categories
Adds a layer of insight: "we spent $400 on food and $120 on transport." Useful for trip retrospectives.

- Add `category?: string` to `Expense` (optional, backward-compatible)
- Predefined list: Food, Transport, Accommodation, Entertainment, Shopping, Other
- Show a category chip/icon on each expense row and in the expense form as a select
- Add a collapsible "Spending by Category" breakdown in `SettlementPanel` (sum per category, per currency)
- **Files:** `src/lib/types.ts`, `src/components/ExpensesPanel.tsx`, `src/components/SettlementPanel.tsx`

---

## P3 — Nice to Have

### 7. Empty-state onboarding
New users land on a blank Participants tab with no context. A three-step hint (Add people → Add expenses → See who pays whom) reduces drop-off.

- Show a horizontal stepper or illustrated callout only when `participants.length === 0`
- Disappears permanently once the first participant is added (no localStorage flag needed)
- **Files:** `src/app/page.tsx` or new `src/components/Onboarding.tsx`

---

### 8. Accessibility audit
Icon-only buttons (✎, ×) have no accessible label. Tab order is untested.

- Add `aria-label` to all icon buttons in `ParticipantsPanel` and `ExpensesPanel`
- Ensure modal/inline edit focus is trapped and returns to the trigger on close
- Run `axe` or Lighthouse accessibility audit and fix all critical violations
- **Files:** `src/components/ParticipantsPanel.tsx`, `src/components/ExpensesPanel.tsx`

---

### 9. localStorage overflow handling
The 5 MB browser limit will silently fail on large datasets with no user feedback.

- Wrap every `localStorage.setItem` in `useLocalStorage.ts` in a try/catch that catches `QuotaExceededError`
- On overflow, surface a persistent banner: "Storage full — export your data to free space"
- **Files:** `src/hooks/useLocalStorage.ts`, `src/app/page.tsx`

---

### 10. PWA (installable, offline)
The app is already offline-capable once loaded. Making it installable closes the last gap.

- Add `public/manifest.json` with app name, icons, `display: standalone`
- Add a minimal service worker (or use `next-pwa`) to cache the app shell
- Add `<link rel="manifest">` in `layout.tsx`
- **Files:** `public/manifest.json`, `public/sw.js`, `src/app/layout.tsx`

---

## Bug Fixes (carry-forward from known issues)

| # | Description | File | Fix |
|---|-------------|------|-----|
| B1 | Deleting a participant destroys shared expenses entirely | `ParticipantsPanel.tsx` | Reassign `paidBy` to a remaining participant and remove the deleted ID from `splitAmong` instead of deleting the expense |
| B2 | Exactly-balanced participant hidden in multi-currency Balance Summary | `SettlementPanel.tsx` | Change filter from `paid > 0.005 \|\| owed > 0.005` to `paid > 0 \|\| owed > 0` (use the unrounded raw values) |
| B3 | Payer not required to be in split — no UI hint | `ExpensesPanel.tsx` | Show an inline note: "Payer is not in the split — they cover the full amount for others" |
