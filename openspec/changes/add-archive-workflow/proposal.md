## Why

CONTRIBUTING.md specifies that CI automatically archives OpenSpec changes after merge to main, creating a PR with auto-merge on success or a Draft PR on failure. This workflow does not exist yet, so archiving must be done manually.

## What Changes

- Add a GitHub Actions workflow (`.github/workflows/archive.yml`) that triggers on push to `main`.
- The workflow checks for unarchived changes in `openspec/changes/`, runs `openspec archive`, and creates a PR.
- On success: PR is created with auto-merge enabled.
- On failure: Draft PR is created with a warning for manual resolution.

## Capabilities

### New Capabilities

_None — this is a CI/CD automation, not a new behavioral capability._

### Modified Capabilities

- `infrastructure`: Adds the archive workflow to the CI/CD pipeline requirements.

## Impact

- **Files added**: `.github/workflows/archive.yml`
- **Dependencies**: `openspec` CLI must be available in the CI runner.
- **Permissions**: Workflow needs `contents: write` and `pull-requests: write` to create branches and PRs.
