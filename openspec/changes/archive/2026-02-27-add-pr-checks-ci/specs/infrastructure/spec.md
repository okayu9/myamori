## ADDED Requirements

### Requirement: PR Checks Workflow

The CI system SHALL run lint, type check, and test checks on every pull request targeting `main`.

#### Scenario: All checks pass

- **WHEN** a pull request targeting `main` is opened or updated
- **AND** the code has no lint errors, no type errors, and all tests pass
- **THEN** all three check jobs succeed

#### Scenario: Lint check fails

- **WHEN** a pull request targeting `main` is opened or updated
- **AND** the code has lint or format errors
- **THEN** the lint job fails
- **AND** the type check and test jobs still run independently

#### Scenario: No PR checks on non-main branches

- **WHEN** a pull request targets a branch other than `main`
- **THEN** the PR checks workflow does not run