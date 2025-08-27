# Directive 000 — Meta: turn on the loop

## Goal
Initialize the Codex loop, create the first plan and checklists, and confirm the repo builds locally (Dev Container) and in CI.

## Constraints
- Cross-platform scripts (no bash-only).
- Keep job names: `validate`, `e2e`, `security` to satisfy branch protection.
- Minimal changes per PR; update `.codex/status.md` after each PR.

## Deliverables
- A PR titled "Codex: bootstrap plan" containing:
  - A task checklist derived from all current directives.
  - A proposed PR sequence with acceptance criteria.
  - Links to created issues for each major task.

## Done When
- Checklist exists and references subsequent PRs/issues Codex will open.
- `.codex/status.md` created with the initial state.
