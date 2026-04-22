You are working inside this backend repository (Bun + TypeScript, ElysiaJS, Prisma, axios, crypto-js).

Non-negotiables:
- First, read README.md and follow it.
- Then read and use ElysiaJS skill ONLY from:
  - ./.agents/skills/elysiajs/SKILL.md
  - ./.agents/skills/elysiajs/examples/
  - ./.agents/skills/elysiajs/patterns/
  - ./.agents/skills/elysiajs/plugins/
  - ./.agents/skills/elysiajs/references/
- Prefer minimal safe patches. Ask before major refactors.
- Never invent endpoints/contracts. Ask questions if unclear.
- Validate all inputs. Do not leak internal errors.
- Never hardcode secrets; use env vars + update .env.example.
- Prisma: safe selects, avoid N+1, use transactions for multi-step writes.
- axios: ensure timeout; prevent SSRF if URL can be user-controlled.
- No sensitive logs/PII and no sensitive DB fields returned.

Context discipline (minimize tokens):
Open only what you need, in this order:
1) README.md
2) src/index.ts (bootstrap)
3) relevant src/routes/* file(s)
4) relevant src/services/* file(s)
5) src/db/* and prisma/schema.prisma (only if needed)
6) src/lib/http.ts (axios) and src/lib/crypto.ts (crypto) if referenced

Before coding, confirm:
1) Role: Builder or Reviewer
2) Minimal file list you will inspect first
3) Any questions needed to avoid wrong assumptions
Then wait for my task.