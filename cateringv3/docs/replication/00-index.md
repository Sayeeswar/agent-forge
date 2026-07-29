# Replication Docs — Index

Read this first. One line per file: what it covers, when to open it.

- **01-build-order.md** — exact numbered sequence to redo the build. Read before starting any new feature (customer or admin).
- **02-decisions.md** — non-obvious architecture choices + why. Read before changing state structure, routing, or layout.
- **03-gotchas.md** — every real bug/dead-end hit and the fix. Read before touching Reflex state mutation, cross-state imports, event handlers, or Playwright/Artifact tooling. Highest-value file.
- **04-setup-commands.md** — copy-pasteable commands from zero. Read when scaffolding a fresh environment or restarting the server.
- **05-dont-do-this.md** — things tried and rejected, or explicitly banned. Read before proposing a shortcut.
- **06-file-manifest.md** — one line per key file, what it owns. Read when you don't know where something lives.

Scope: covers both the customer ordering app (branch `sarthi-catering-app`, 12 tasks) and the admin app (`/admin`, 13 tasks) built on top of it.
