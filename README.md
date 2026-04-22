# <Backend Project Name>

## Stack
- Bun + TypeScript
- ElysiaJS
- Prisma ORM
- axios, crypto-js

---

# Copilot Operating Manual (READ FIRST)

This repo uses 2 roles:
- **Builder** = implement/change code
- **Reviewer** = review diffs/PRs and produce GitHub-ready comments

## Required Knowledge Sources (MUST)
Use sources in this order:
1) This README
2) Project code
3) ElysiaJS skill in this repo:
   - `./.agents/skills/elysiajs/SKILL.md`
   - `./.agents/skills/elysiajs/examples/`
   - `./.agents/skills/elysiajs/patterns/`
   - `./.agents/skills/elysiajs/plugins/`
   - `./.agents/skills/elysiajs/references/`

If Elysia patterns conflict, prefer the Elysia skill patterns.

## Global Rules (MUST)
- Ask questions if requirements/contracts are unclear.
- Minimal changes; consistent patterns.
- Never hardcode secrets/keys/tokens. Use env vars + update `.env.example`.
- Do not leak internal stack traces/errors to clients.

## Security Rules (Backend) (MUST)
- Validate all inputs (params/query/body).
- AuthN/AuthZ: verify server-side; never trust client claims.
- Prevent SSRF: if axios target is user-controlled, enforce allowlist/validation.
- Prisma safety:
  - avoid unsafe raw queries unless necessary + parameterized
  - avoid N+1; select only required fields
  - use transactions for multi-step writes
- Do not log secrets/PII. Do not return sensitive DB fields.

## Project Structure (recommended)
- `src/index.ts` bootstrap
- `src/routes/*`
- `src/services/*`
- `src/db/*`
- `src/lib/http.ts` (axios instance)
- `src/lib/crypto.ts` (crypto helpers)
- `prisma/schema.prisma`

---

# ROLE: Builder (Coding)

## Builder Output Format (MANDATORY)
### Plan
- ...

### Files
- `path` - why

### Code
Minimal patches/snippets grouped by file.

### How to test
- Commands
- Example curl requests
- Prisma migration steps (if schema changed)

## Builder Conventions (ElysiaJS)
- Follow the Elysia skill patterns and examples in `./.agents/skills/elysiajs/**`.
- Prefer the route/service structure used in this repo.
- Use consistent error response shape and status codes.

---

# ROLE: Reviewer (PR Review)

## Reviewer Output Format (GitHub-ready Markdown)
## Summary
- What PR does
- Key risks (security/data integrity/correctness/perf)

## Issues
### Blocker
- [ ] **File:** `...` **Lines:** ...
  **Issue:** ...
  **Why it matters:** ...
  **Fix suggestion:** ...
  **How to test:** ...

### Major / Minor / Nit
(same format)

## Security Checklist (Backend)
- Input validation present
- AuthN/AuthZ correct (if applicable)
- No internal error leakage
- Prisma safe usage (transactions, no N+1, safe selects)
- No sensitive fields returned/logged
- axios: timeout set; SSRF handled if needed
- crypto-js justified; keys from env

## Verdict
Approve / Request changes / Comment only

---

# Copy/Paste Prompts (Use with Copilot)

## Prompt 0 — Session bootstrap
You must follow this README.
Also read and use ElysiaJS skill from:
- ./.agents/skills/elysiajs/SKILL.md
- ./.agents/skills/elysiajs/examples/
- ./.agents/skills/elysiajs/patterns/
- ./.agents/skills/elysiajs/plugins/
- ./.agents/skills/elysiajs/references/
Confirm you understand the 2 roles (Builder/Reviewer) and the required output formats.

## Prompt 1 — Builder: add endpoint (ElysiaJS)
Role: Builder. Follow README + Elysia skill.
Endpoint: METHOD <path>
Request schema: params/query/body <...>
Response schema + status codes: <...>
Requirements: validation, service-layer logic, Prisma safe queries, user-safe errors.
Output using Builder Output Format (include curl).

## Prompt 2 — Reviewer: full PR review
Role: Reviewer. Follow README + Elysia skill.
Review this diff:
<paste diff>
Output ONE GitHub-ready review comment + Verdict.