## ADDED Requirements

### Requirement: Project Toolchain Configuration

The project SHALL include configuration for Biome (lint/format), Vitest (testing with Workers pool), and TypeScript (strict mode, Workers types) so that `bunx biome check .`, `bunx tsc --noEmit`, and `bunx vitest run` succeed on a fresh clone after `bun install`.

#### Scenario: Lint and format check passes on scaffold

- **WHEN** a developer runs `bunx biome check .` after `bun install`
- **THEN** the command exits with code 0
- **AND** no lint or format errors are reported

#### Scenario: Type check passes on scaffold

- **WHEN** a developer runs `bunx tsc --noEmit` after `bun install`
- **THEN** the command exits with code 0
- **AND** no type errors are reported

#### Scenario: Tests pass on scaffold

- **WHEN** a developer runs `bunx vitest run` after `bun install`
- **THEN** the command exits with code 0
- **AND** at least one test passes

### Requirement: Minimal Worker Entry Point

The project SHALL include a minimal Cloudflare Worker entry point at `src/index.ts` that responds to HTTP requests, serving as the foundation for all subsequent feature development.

#### Scenario: Health check endpoint

- **WHEN** a GET request is sent to `/`
- **THEN** the Worker responds with HTTP 200
