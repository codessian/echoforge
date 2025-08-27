# Codex Operating Manual (Autopilot Loop)

**Mission**: Work from the directives under `.codex/directives/`, keep a living checklist,
open PRs, and report progress after every merged PR or blocking failure.

**Loop**:
1. Read directives and propose a plan in a PR description checklist.
2. Implement in small PRs from branches named `codex/{feature}`.
3. After merge or block: update `.codex/status.md` with outcomes, decisions, new tasks.
4. Keep the backlog in `.codex/backlog.md` (append-only), prune superseded tasks.

**Definitions of Done**:
- CI green on required jobs (`validate`, `e2e`, `security`).
- PR checklist ticked, notes captured in `.codex/status.md`.
- If blocked by policy/org settings, document exact blocker and open an issue.

**Conventions**:
- Branches: `codex/{feature}` (Codex setting already matches).
- Commits: small, descriptive; include “Co-authored-by: Codex”.
- Checklists: live in PR description and `.codex/status.md`.
