# Directive 020 — Dev Container & cross-platform

## Goal
Add a Dev Container so local development is reproducible and Linux-like everywhere.
Normalize line endings.

## Tasks
- Add `.devcontainer/devcontainer.json` using Node 20 image and pnpm bootstrap.
- Add `.gitattributes` with LF normalization and PS1/BAT CRLF hints.
- Update CONTRIBUTING with "Open in Dev Container" quick start.

## Acceptance Criteria
- “Reopen in Container” yields `pnpm -w install` success.
- Line-ending churn disappears in new commits.

## Artifacts
- `.devcontainer/devcontainer.json`, `.gitattributes`, CONTRIBUTING updates.
