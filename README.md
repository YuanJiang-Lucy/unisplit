# UniSplit

**UniSplit** is a lightweight multi-currency expense splitting tool designed for international students.

It helps one person record shared expenses and automatically generate a clear settlement plan for a group — especially useful in temporary social scenarios such as dining, rent sharing, grocery shopping, and trips.

> A 0-to-1 product project covering problem definition, MVP (Min Viable Product) design, AI-assisted development, and deployment.

## Live Demo

- **Online Demo:** https://unisplit.vercel.app/
- **Repository:** https://github.com/YOUR_USERNAME/unisplit

---

## Product Overview

International students often face shared payment scenarios involving:

- rent and utilities
- group dining
- grocery splitting
- travel expenses
- multi-currency payments

In these situations, existing tools can feel too heavy because they often require multiple users to download, register, and join the same bill group.

UniSplit is designed to solve this with a lighter workflow:

**One person records expenses → the system calculates balances → a clear settlement result is generated**

This makes it easier to use in temporary or casual group scenarios.

---

## Key Features

- **One-person bookkeeping**  
  No need for every participant to create an account

- **No login required**  
  Lower friction for temporary group use

- **Multi-currency support**  
  Record expenses in different currencies

- **Automatic settlement**  
  Calculate net balances for each participant

- **Debt simplification**  
  Reduce unnecessary transfers and generate clear “who pays whom” results

- **Built-in exchange helper (`Uni-Bear`)**  
  Lightweight floating currency conversion tool for quick reference

---

## MVP Scope

To keep the product focused and validate the core value quickly, the MVP only includes the minimum set of features needed to complete the settlement flow.

### 1. Participants
- Add participants
- Edit participants
- Delete participants
- Duplicate name validation

### 2. Expenses
- Add shared expenses
- Select payer
- Select participants involved
- Support multiple currencies
- Equal split (AA) only in MVP

### 3. Settlement
- Calculate net balances
- Generate clear settlement results
- Simplify debt relationships

### 4. Uni-Bear Exchange Helper
- Floating exchange calculator
- Supports quick currency conversion
- For reference only
- Separate from the settlement engine

---

## Product Thinking

UniSplit is **not** trying to be a full-featured long-term bookkeeping platform.

Instead, it focuses on a specific product direction:

- lightweight
- low-friction
- temporary group scenarios
- clear settlement outcome

### What was intentionally excluded from the MVP?

To control implementation cost and keep the product focused, the following features were deliberately left out of the MVP:

- login / registration system
- historical bill books
- expense categories
- custom split ratios
- social / notification features

The main goal of the MVP is simple:

**Help users get a clear, executable settlement result as quickly as possible.**

---

## User Scenarios

UniSplit is especially useful for:

- roommates splitting rent or utilities
- friends sharing dining bills
- group grocery purchases
- short trips with shared expenses
- international student groups dealing with multiple currencies

---

## Tech Stack

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **localStorage**
- **Vercel**

---

## Development Workflow

This project was built as a **0-to-1 PM + AI-assisted development practice**.

### Workflow
1. Define user problem and product direction
2. Conduct lightweight competitor analysis
3. Scope the MVP and write product requirements
4. Use Claude Code to generate the initial Next.js app structure
5. Validate and iterate on product logic, UI, and interaction details
6. Manage code with GitHub
7. Deploy to Vercel for public access

### My Role
I was responsible for:

- problem definition
- product positioning
- MVP scoping
- feature design
- prompt design for AI-assisted development
- functionality validation
- bug fixing coordination
- deployment and demo delivery

---

## Local Development

Clone the repository and run the app locally:

~~~bash
git clone https://github.com/YOUR_USERNAME/unisplit.git
cd unisplit
npm install
npm run dev
~~~

Then open:

~~~text
http://localhost:3000
~~~

---

## Project Structure

~~~text
src/
  components/
  hooks/
  lib/
public/
~~~

---

## Screenshots

Add screenshots here if available:

~~~markdown
![Participants Page](./public/screenshots/participants.png)
![Expenses Page](./public/screenshots/expenses.png)
![Settlement Page](./public/screenshots/settlement.png)
~~~

---

## Deployment

The project is deployed on **Vercel** and connected to **GitHub** for automatic redeployment on new commits.

- **Production URL:** https://unisplit.vercel.app/

---

## Why This Project

UniSplit was built to explore how a product manager can move beyond PRDs and prototypes to actually ship a working MVP.

This project demonstrates:

- user-centered problem definition
- MVP prioritization and trade-off decisions
- competitor-informed product positioning
- AI-assisted rapid prototyping
- end-to-end product delivery from idea to deployment

---

## Future Improvements

Potential next steps include:

- custom split ratios
- shareable settlement links
- exportable settlement summary
- backend and cloud sync
- historical exchange rates
- mobile-first optimization
