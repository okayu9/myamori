# Project Context

## Purpose

A personal AI assistant that runs on Cloudflare Workers and is accessed through Discord. It helps with everyday tasks: checking forwarded emails, managing calendar events, storing/retrieving files, searching the web, and running scheduled tasks.

## Goals

- Talk to an LLM via Discord that understands conversational context
- Search and read forwarded emails
- Check, create, update, and delete calendar events (with human approval for mutations)
- Store and retrieve files
- Search the web for information
- Run scheduled tasks automatically (morning briefings, periodic reminders, etc.)

## Non-Goals

- Sending emails (read-only)
- Accessing local machines or remote control
- Voice interaction or smart home control
- Multi-user / public-facing deployment (single-user only)

## Design Principles

1. **Least Privilege** — Each tool gets the minimum scope required. Human-in-the-loop is the default for risky operations.
2. **Cloudflare-Native** — No VPS. Leverage Workers, D1, R2, Queues, and other managed services to minimize infrastructure management.
3. **Start Small + Extensible** — Phase 1 is Discord only. Channel adapters are abstracted so Slack or other channels can be added later.
4. **Auditable** — Every LLM call and tool execution is logged. Always know what was executed.
5. **Human-Mediated** — Emails are received via forwarding (not direct mailbox access). Calendar mutations and high-risk operations require explicit approval. The LLM is not given excessive autonomy.

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Local Runtime**: Bun
- **Production Runtime**: Cloudflare Workers (workerd)
- **HTTP Framework**: Hono
- **LLM Interface**: Vercel AI SDK (`ai`)
- **ORM**: Drizzle ORM (D1)
- **Validation**: Zod
- **Discord**: discord-interactions (Webhook verification)
- **CalDAV**: tsdav
- **Email Parsing**: postal-mime
- **IaC**: OpenTofu
- **Testing**: Vitest
- **Linting**: Biome

## Conventions

- All source code in `src/`
- Strict TypeScript (`strict: true`)
- Zod schemas for all tool input/output validation
- Drizzle ORM for all D1 database access
- Biome for linting and formatting
- Vitest for testing

## Phased Roadmap

### Phase 1: Minimal Viable Assistant

- Bootstrap script + OpenTofu for Cloudflare resource provisioning
- Project scaffolding (Hono + Workers + TypeScript + Drizzle)
- Discord Interaction Webhook adapter
- Agent loop (LLM calls + conversation history)
- Email ingestion (Email Workers) + search/read tools
- File operations (R2)
- Authentication (user ID allowlist), rate limiting, audit logging

### Phase 2: Calendar, Approval Flow, Scheduling

- Apple Calendar integration (CalDAV via tsdav, Workers compatibility verification)
- Approval flow (button UI for calendar mutations, file deletion, etc.)
- Scheduled tasks (dynamic cron job management)
- Web search tool

### Phase 3: Memory, Channel Expansion, Stabilization

- Long-term memory (Vectorize + Workers AI embeddings)
- Slack adapter
- Morning briefing (unread email summary + today's schedule)
- Error handling hardening, operational stability, cost optimization

## Cost

Cloudflare free tiers are sufficient for personal use. The only real cost is LLM API usage.

## Specs

Detailed specifications are in `openspec/specs/`:

- [Architecture](specs/architecture/spec.md) — Overall system architecture and Cloudflare service usage
- [Channels](specs/channels/spec.md) — Channel abstraction and Discord webhook design
- [Agent](specs/agent/spec.md) — Agent loop, LLM interaction, memory
- [Tools](specs/tools/spec.md) — Tool framework, email, calendar, files, web search
- [Scheduler](specs/scheduler/spec.md) — Fixed and dynamic cron jobs
- [Security](specs/security/spec.md) — Authentication, approval flow, audit logging, rate limiting
- [Infrastructure](specs/infrastructure/spec.md) — OpenTofu, CI/CD, directory structure
