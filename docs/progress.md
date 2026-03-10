# UniSplit — Progress

## Product Status

MVP is complete and functional. The app runs locally (`npm run dev`) and builds cleanly for production (`npm run build`). All core user flows work end-to-end with no backend or login required.

---

## Implemented Features

### Participants
- Add a participant by name; duplicate names are rejected (case-insensitive)
- Inline rename: click a name or the ✎ icon, edit in-place, confirm with Enter or Save
- Delete a participant; shows a confirmation dialog listing how many expenses will also be removed
- Color-coded avatars assigned automatically (8-color round-robin palette)

### Expenses
- Add an expense with: description, amount, currency, paid-by, split-among, date
- Split is equal among all selected participants (toggle pill buttons)
- Edit any existing expense: ✎ icon loads the expense into the form in edit mode; Update saves it in-place
- Delete an expense with the × button
- Expense list sorted by date descending
- `paidBy` and `splitAmong` stay valid if the participants list changes while the form is open

### Settlement
- Net balance computed per participant, per currency
- Greedy algorithm minimises the number of transactions required to settle all debts
- Per-currency settlement (no cross-currency merging)

### Settlement UI — Balance Summary
- Single currency: flat participant list with net balance, amount paid, and amount owed
- Multiple currencies: separate labeled block per currency; only participants with involvement in that currency are shown; zero-balance participants are hidden
- Net values colored: green (owed money), red (owes money), grey (settled)

### Settlement UI — Suggested Settlements
- Single currency: flat card list
- Multiple currencies: grouped into labeled blocks matching the Balance Summary structure
- "All settled up!" state when no transactions are needed

### Data Persistence
- All data stored in `localStorage` under keys `unisplit_participants` and `unisplit_expenses`
- SSR-safe: hydration guard prevents server/client mismatch on first render
- Global Reset button clears all data after confirmation

### General
- No login, no backend, no database
- Fully offline-capable once loaded
- Responsive single-column layout; works on mobile browsers
- Tab badges show live participant and expense counts

---

## Known Issues

| # | Area | Description |
|---|------|-------------|
| 1 | Expenses | Deleting a participant removes all expenses they were involved in, even if other participants were part of those expenses. A safer approach would be to reassign or archive the expense rather than delete it. |
| 2 | Currencies | Balance Summary hides participants with zero balance in a given currency. A participant who was involved in that currency but ended up exactly balanced will also be hidden (edge case). |
| 3 | Currencies | No exchange-rate conversion. Multi-currency groups must settle each currency independently; there is no way to see a single consolidated "who owes whom" across currencies. |
| 4 | Expenses | The expense form does not prevent adding an expense where the payer is not included in the split. This is valid (e.g. someone pays on behalf of others and owes nothing), but could confuse first-time users. |
| 5 | Data | `localStorage` has a ~5 MB browser limit. Very large groups with thousands of expenses could hit this limit with no user-visible error. |
| 6 | UX | No undo for deletions. Deleted participants and expenses are immediately unrecoverable (within the session). |

---

## Next Recommended Steps

### High Priority
- **Export / share**: allow exporting the current group as a JSON file or shareable URL (base64-encoded state), so users can back up data or share a session with others.
- **Unequal splits**: support percentage-based or fixed-amount splits, not just equal division — a common real-world need.
- **Mark settlement as paid**: let users tick off a suggested settlement transaction so they can track what has actually been paid.

### Medium Priority
- **Group / trip management**: support multiple named groups (e.g. "Tokyo Trip", "Flat Bills") stored side-by-side in localStorage, with the ability to switch between them.
- **Expense categories**: tag expenses (food, transport, accommodation) for a summary breakdown.
- **Currency conversion**: integrate a static or live exchange-rate lookup so multi-currency groups can see a single consolidated balance.

### Low Priority / Polish
- **Undo delete**: short-lived toast with an Undo action after deleting a participant or expense.
- **Empty-state onboarding**: a brief guided prompt on first load to walk new users through the three-step flow.
- **Accessibility**: audit keyboard navigation and add proper ARIA labels to icon-only buttons (✎, ×).
- **PWA**: add a `manifest.json` and service worker so the app can be installed and used offline on mobile.
