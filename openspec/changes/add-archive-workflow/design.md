## Context

CONTRIBUTING.md defines a post-merge archive step: CI runs `openspec archive` and creates a PR with auto-merge on success, or a Draft PR on failure. No CI workflows exist yet. `openspec` is a globally installed CLI (v1.2.0), available via `npx openspec` or `bunx openspec` in CI.

## Goals / Non-Goals

**Goals:**

- Automate `openspec archive` on every push to `main`.
- Create a normal PR with auto-merge when archive succeeds.
- Create a Draft PR with a warning when archive fails.
- Skip cleanly when there are no unarchived changes.

**Non-Goals:**

- Staging/production deploy workflows (separate change).
- PR check workflows (lint, type check, test — separate change).
- Running archive on any branch other than `main`.

## Decisions

### Decision: Check for unarchived changes before running archive

The workflow first checks if `openspec/changes/` contains any non-archived changes (directories without `.archived` marker or outside `archive/`). If none exist, the workflow exits early. This avoids unnecessary PR creation attempts.

**Alternative considered**: Always run `openspec archive` and let it no-op — rejected because it may still produce a commit or output even when nothing changed.

### Decision: Use `gh pr create` with `--label auto-merge` and `gh pr merge --auto`

After creating the PR, immediately enable auto-merge via `gh pr merge --auto --squash`. This uses GitHub's native auto-merge feature. If required status checks are configured later, auto-merge waits for them to pass.

**Alternative considered**: Merge directly without a PR — rejected because main has push protection requiring PRs.

### Decision: Use `npx openspec` in CI

Install openspec on-the-fly via `npx openspec@1` (major version pinned). This avoids adding it as a devDependency for a CI-only tool.

**Alternative considered**: Add to devDependencies — rejected because openspec is a development workflow tool, not a project dependency.

### Decision: Branch naming `archive/<run-id>`

Use `archive/run-<github-run-id>` as the branch name. The run ID is unique per workflow execution, preventing conflicts.

## Risks / Trade-offs

- [openspec CLI breaking change] Pinned to `@1` major version → Mitigation: CI failure surfaces the issue; update the pin when upgrading.
- [Auto-merge blocked by required status checks] If checks are added later and they fail on the archive PR → Mitigation: Archive PRs only change markdown files in `openspec/`, so lint/type/test checks should pass or not apply.
- [Concurrent archive runs] Two merges in quick succession could race → Mitigation: GitHub's branch protection prevents conflicting merges; the second auto-merge will wait or fail and can be retried.
