# 04 — Run full test suite, typecheck, build validation, and code review

**What to build:** Run typechecking (`npx tsc --noEmit`), run Vitest tests (`npx vitest run`), run production build (`npm run build`), and perform a code review against repo standards.

**Blocked by:** 03 — Migrate page.tsx and greedy/page.tsx dashboard callers to evaluateContest

**Status:** resolved

- [x] Run `npx tsc --noEmit` and fix any TypeScript errors
- [x] Run `npx vitest run` and confirm 100% test pass rate
- [x] Run `npm run build` and ensure clean build
- [x] Execute `/code-review` checks against standards and spec

