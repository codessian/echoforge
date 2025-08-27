# Directive 010 — Workspace hygiene (builds/lint/tests)

## Goal
`pnpm -w build`, `pnpm -w test`, and `pnpm -w lint` succeed locally (Dev Container) and in CI.

## Tasks
- Ensure every package that runs `tsup`/`rimraf` declares them in that package's devDependencies.
- ESLint v9 flat-config only (no `.eslintignore`); use `ignores` in the config.
- Make pre-commit pass: fix lint-staged config and ESLint imports.
  - If `config/eslint.config.mjs` imports `typescript-eslint`, either install `typescript-eslint` or switch to `@typescript-eslint/*` packages only.
- Replace any bash-only scripts with Node-based scripts.
- Keep job names for branch protection: `validate`, `e2e`, `security`.

## Acceptance Criteria
- CI workflows green on Ubuntu and Windows runners.
- `pnpm -w build` runs without “Cannot find module …/tsup…”.
- Pre-commit completes without errors on a small staged change.

## Artifacts
- Updated package.json files (per-package devDeps).
- Updated ESLint config + lint-staged config.
- PR checklist showing each subtask complete.
