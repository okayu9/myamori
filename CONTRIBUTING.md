# Contributing

## Development Environment Setup

### Prerequisites

- [Bun](https://bun.sh) — Runtime & package manager
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) — Cloudflare Workers CLI
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) — Specification management
- [OpenTofu](https://opentofu.org/) — Infrastructure as Code (infra work only)

### Getting Started

```sh
git clone <repo-url> && cd myamori
bun install
cp .dev.vars.example .dev.vars  # Edit with your local credentials
```

## Development Flow

This project uses [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow) combined with [OpenSpec](https://github.com/Fission-AI/OpenSpec) for specification-driven development.

Direct pushes to `main` are prohibited. All changes go through pull requests.

```
1. Branch        git checkout -b feat/add-discord-adapter
                 ↓
2. Propose       /opsx:propose "Add Discord webhook adapter"
                 → generates proposal.md, design.md, tasks.md
                 ↓
3. Implement     /opsx:apply
                 → write code and tests following tasks.md
                 ↓
4. Push & PR     git push -u origin feat/add-discord-adapter
                 gh pr create
                 ↓
5. CI            Biome lint + tsc type check + Vitest (automatic)
                 ↓
6. Review        Address feedback, push fixes
                 ↓
7. Merge         Squash or merge into main
                 ↓
8. Post-merge    CI deploys (wrangler deploy)
                 CI runs openspec archive → creates archive PR
```

### OpenSpec Change = Branch = PR

Each OpenSpec change maps to exactly one feature branch and one pull request. Keep changes small and focused to make PRs reviewable.

### Archive After Merge

After a feature PR is merged, CI automatically runs `openspec archive` and creates a PR to update specs and move the change to `changes/archive/`. If archive fails (e.g., spec conflicts), CI creates a Draft PR with a warning for manual resolution.

## Branch Naming

Format: `<type>/<kebab-case-description>`

The `<type>` prefix aligns with [Conventional Commits](#commit-messages):

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat/add-discord-adapter` |
| `fix` | Bug fix | `fix/email-parsing-utf8` |
| `refactor` | Code restructuring | `refactor/extract-tool-runner` |
| `chore` | Maintenance | `chore/update-dependencies` |
| `docs` | Documentation | `docs/add-contributing` |
| `test` | Test additions | `test/add-agent-unit-tests` |
| `ci` | CI/CD changes | `ci/add-lint-workflow` |
| `archive` | Auto-generated archive | `archive/add-discord-adapter` |

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/).

Format: `<type>(<scope>): <description>`

- **type** (required): `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`
- **scope** (optional): `agent`, `channels`, `tools`, `scheduler`, `security`, `infra`
- **description** (required): imperative mood, lowercase, no period

Examples:

```
feat(channels): add Discord webhook handler
fix(tools): handle UTF-8 encoded email subjects
test(agent): add router unit tests
chore: update dependencies
docs: add contributing guide
```

### Breaking Changes

Add `!` after the type/scope and include a `BREAKING CHANGE:` footer:

```
feat(channels)!: change message format to v2

BREAKING CHANGE: IncomingMessage.content is now a structured object instead of a string.
```

## Pull Requests

### Title

Use the same Conventional Commits format as commit messages:

```
feat: add Discord adapter
fix: handle email parsing edge cases
```

### Description

- Reference the OpenSpec proposal: `See openspec/changes/<name>/proposal.md for full context.`
- Summarize what changed and why (keep it brief — the proposal has the details).
- Note anything reviewers should pay attention to.

## CI Pipeline

### PR Checks (required to pass before merge)

| Check | Command | Purpose |
|-------|---------|---------|
| Lint & Format | `bunx biome check .` | Code style enforcement |
| Type Check | `bunx tsc --noEmit` | Type safety |
| Test | `bunx vitest run` | Unit & integration tests |

### Post-Merge (on `main`)

| Step | Trigger | Action |
|------|---------|--------|
| Deploy | Every merge | `wrangler deploy` |
| Archive | When `openspec/changes/` has unarchived changes | `openspec archive` → PR |

## Testing

### Runner

[Vitest](https://vitest.dev) with [`@cloudflare/vitest-pool-workers`](https://developers.cloudflare.com/workers/testing/vitest-integration/) for Cloudflare Workers bindings support.

```sh
bunx vitest run        # Run all tests
bunx vitest run unit   # Run unit tests only
bunx vitest            # Watch mode
```

### Directory Structure

Tests live in a separate `test/` directory, mirroring `src/`:

```
test/
├── tsconfig.json          # Test-specific TypeScript config
├── env.d.ts               # ProvidedEnv type declarations (D1, R2, KV bindings)
├── unit/                  # Unit tests (mirrors src/ structure)
│   ├── agent/
│   │   └── router.test.ts
│   ├── tools/
│   │   └── email.test.ts
│   └── channels/
│       └── discord.test.ts
├── integration/           # Integration tests
├── e2e/                   # End-to-end tests (future)
└── fixtures/              # Shared test data
```

### Guidelines

- **Mock at external boundaries**: LLM APIs, D1, R2, KV, external services (CalDAV, etc.)
- **Keep business logic pure**: Extract logic into pure functions that are easy to test without mocks.
- **New features require tests**: Every new feature or bug fix should include corresponding unit tests.

## Code Style

- **Linter & formatter**: [Biome](https://biomejs.dev/) — run `bunx biome check .` locally.
- **TypeScript**: Strict mode (`strict: true`). No `any` unless absolutely necessary.
- **Validation**: Use [Zod](https://zod.dev/) schemas for all external input validation (API requests, tool inputs/outputs).