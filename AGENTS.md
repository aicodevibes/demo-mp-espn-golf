<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 🛑 1. WORKFLOW & PIPELINE (ANTIGRAVITY OVERRIDES)
* **FORBIDDEN:** Do NOT create or use `implementation-plan.md` or `tasks.md`.
* **REQUIRED PIPELINE:** Execute features through Matt Pocock's skills sequentially:
  ` /grill-with-docs ` ➔ ` /to-spec ` ➔ ` /to-tickets ` ➔ ` /implement ` ➔ ` /code-review `
* **GIT ISOLATION:** Never code on `main`. Always create a feature branch off `main` or a parent ticket: `git checkout -b feat/<issue-id>-<description>`.
* **ROUTER:** If unsure which skill fits a complex or non-standard task, invoke `/ask-matt` for routing before taking custom action.

---

## 🔐 2. NEXT.JS & FIREBASE BOUNDARIES

| Layer | Allowed Scope | Strict Restrictions |
| :--- | :--- | :--- |
| **Client** (`"use client"`) | Client SDK (`firebase/auth`, `firebase/firestore`), real-time listeners (`onSnapshot`). | ❌ NEVER import `firebase-admin`<br>❌ NO secret keys |
| **Server** (Actions, SSR) | Server SDK (`firebase-admin`), privileged mutations, secure data fetching. | ❌ NO client-side bundle leaks |
| **Testing** | Firebase Emulators (`FIRESTORE_EMULATOR_HOST`). | ❌ NEVER touch production data during tests |

---

## 🧪 3. QUALITY GATES & CONTEXT
* **Pre-Commit Check:** Run `npm run check` (TypeScript + Lint) before any PR.
* **TDD Loop:** Write a failing test first (Red), implement code to pass (Green), then refactor.
* **Domain Vocabulary:** Refer to `CONTEXT.md` for project-specific terms and definitions before writing feature code.

