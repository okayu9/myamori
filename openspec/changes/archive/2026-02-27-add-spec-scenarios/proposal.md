## Why

All 61 existing requirements across 7 spec files lack scenarios, which is required by the OpenSpec schema. This causes `openspec archive` to fail with "Requirement must have at least one scenario", blocking automated archiving of completed changes.

## What Changes

- Add at least one scenario (WHEN/THEN format) to every existing requirement across all 7 spec files.
- No requirement text is changed — only scenarios are appended.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `agent`: Add scenarios to 6 requirements.
- `architecture`: Add scenarios to 9 requirements.
- `channels`: Add scenarios to 6 requirements.
- `infrastructure`: Add scenarios to 12 requirements.
- `scheduler`: Add scenarios to 6 requirements.
- `security`: Add scenarios to 10 requirements.
- `tools`: Add scenarios to 12 requirements.

## Impact

- **Files modified**: All 7 spec files in `openspec/specs/`.
- **No code changes**: This is a documentation-only change.
- **Unblocks**: `openspec archive` without `--skip-specs`.
