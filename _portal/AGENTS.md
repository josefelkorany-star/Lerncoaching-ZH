# Portal v1

Only this separate portal worktree/branch is in scope. Preserve the website/PDF worktree and PR #5. No production release or real families are authorized.

Browser operations require a demonstrably isolated cloud browser. Never use, inspect or import personal/local browsers, profiles, cookies, tabs or remote debugging. No paid browser testing. Local CLI/PostgreSQL tests with synthetic data are permitted and are not browser tests.

Keep the supplied prototype and private reports outside the repository. Never place credentials, tokens, passwords or real family data here. Synthetic automated fixtures are development-only, never production migrations or built-in public frontend data. Portal configuration remains empty/off by default.

Enforce authorization on the server for every row and field. Passing a model test or simulated SQL session is not a Supabase Auth/PostgREST acceptance pass. Document missing tests honestly. No generic browser-side administrator/service-role client.

Separate file ownership for subagents. Review migrations, role matrices, hidden-field payloads, deprovisioning, historical calculation rules and asynchronous UI data clearing independently before handing over.
