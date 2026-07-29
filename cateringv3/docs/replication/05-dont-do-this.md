# Don't Do This

Tried and rejected, or explicitly banned. Don't repeat.

- **Don't use `rx.html()` or `rx.el`** to chase pixel-perfect match with a design — banned even when explicitly asked. Use the native Reflex component even if it renders slightly differently.
- **Don't guess a Reflex API.** Verify component/prop/event names against reflex-docs or installed source before writing them, every time — including things that "feel" standard (e.g. `rx.badge`, `rx.switch.on_change`).
- **Don't put arithmetic, string-joining, or business conditionals in the component tree.** Even something as small as joining an order's item summary string (`"2× Paneer Paratha · 1× Puri"`) belongs in a pure function, not inline in a component.
- **Don't share one state class across features.** Even when two features feel closely related (menu editing and order fulfillment are both "admin"), give them separate state classes.
- **Don't fold two unrelated changes into one commit** — e.g. someone else's pending file rename plus your own new feature line in the same file. Split them.
- **Don't touch, read, or write the customer app's page/state files while building the admin app** (`customersec/*.py`, `customerorderstate.py`, `customerpackingstate.py`, `stageoverlaystate.py`) — not even to "just check" something.
- **Don't read `assets/*.png` screenshots** for design reference — banned to save tokens. Use the design spec's text description, or a Claude Artifact + Playwright capture instead.
- **Don't use `WebFetch` on a Claude Artifact URL expecting real content** — it only returns the JS-bundler loader shell. Use Playwright.
- **Don't leave a literal placeholder (`if False`, `# TODO: fill in`) in a *committed* plan or code step** as a "come back to this" marker across multiple steps of the same task — write the correct version directly in one pass instead of staging a fake intermediate.
- **Don't assume one button's `on_click` can conditionally pick between two handlers via `rx.cond`** — render two buttons instead.
- **Don't pre-populate a Reflex state's mutable class-level default with nested seed data directly** — seed via an `on_load` handler instead.
- **Don't fall back to a CDN `<link>` for fonts** even if the download step is slow or flaky — self-hosted is a hard requirement (offline/CSP), not a preference.
- **Don't switch to writing a new plan if context usage is above ~95%** — say "we can do planning later" instead (explicit standing rule).
- **Don't force a shared component helper (e.g. the customer app's `primary_button`/`pill_button`) onto a new UI whose color/variant doesn't match what that helper supports** — it's fine to define new local styling for a genuinely different visual variant rather than distorting or modifying the shared helper (which is also guard-railed as import-only).
