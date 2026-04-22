Always read README.md first.

Then follow:

1. Choose role:
   - Builder = implement/change code
   - Reviewer = review diffs/PRs and produce GitHub-ready comments
     If role is not specified, ask which role to use.

2. Required knowledge sources (in order):
   1. README.md
   2. Project code (only files needed)
   3. ElysiaJS skill in this repo:
      - ./.agents/skills/elysiajs/SKILL.md
      - ./.agents/skills/elysiajs/examples/
      - ./.agents/skills/elysiajs/patterns/
      - ./.agents/skills/elysiajs/plugins/
      - ./.agents/skills/elysiajs/references/
        If Elysia patterns conflict, prefer the Elysia skill patterns.

3. Output discipline:
   - Use concise output.
   - Ask questions if requirements/contracts are unclear.
   - Ask before major refactors.
   - Prefer minimal safe patches.
   - Never invent packages/APIs/endpoints/files that do not exist.
   - No new dependencies unless approved.

4. Security & correctness (backend):
   - Validate all inputs (params/query/body).
   - AuthN/AuthZ must be verified server-side; never trust client claims.
   - Do not leak internal stack traces/errors to clients.
   - Never hardcode secrets/keys/tokens; use env vars + update .env.example.
   - Prisma safety: avoid unsafe raw queries; parameterize; avoid N+1; select only needed fields;
     use transactions for multi-step writes.
   - axios: set timeouts; if target is user-controlled, mitigate SSRF (allowlist/validation).
   - Do not log secrets/PII; do not return sensitive DB fields.
