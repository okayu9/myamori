## ADDED Requirements

### Requirement: Archive Workflow

The CI system SHALL run an archive workflow on every push to `main` that checks for unarchived OpenSpec changes and creates a PR to archive them.

#### Scenario: Unarchived changes exist and archive succeeds

- **WHEN** a push to `main` occurs
- **AND** `openspec/changes/` contains unarchived changes
- **AND** `openspec archive` completes successfully
- **THEN** the workflow creates a PR with the archived changes
- **AND** enables auto-merge on the PR

#### Scenario: Unarchived changes exist and archive fails

- **WHEN** a push to `main` occurs
- **AND** `openspec/changes/` contains unarchived changes
- **AND** `openspec archive` fails
- **THEN** the workflow creates a Draft PR with uncommitted changes
- **AND** the PR body contains a warning indicating manual resolution is needed

#### Scenario: No unarchived changes

- **WHEN** a push to `main` occurs
- **AND** `openspec/changes/` contains no unarchived changes
- **THEN** the workflow exits without creating a PR
