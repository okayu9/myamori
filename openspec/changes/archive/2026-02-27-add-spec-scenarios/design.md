## Context

The project's specs were written as initial design documents with SHALL statements but no scenarios. OpenSpec requires every requirement to have at least one scenario for validation. Adding scenarios retroactively to all 61 requirements will make the specs compliant and unblock automated archiving.

## Goals / Non-Goals

**Goals:**

- Add WHEN/THEN scenarios to every requirement in all 7 spec files.
- Keep scenarios focused on observable behavior, matching existing requirement text.
- Ensure `openspec archive` passes validation after this change.

**Non-Goals:**

- Changing or improving the existing requirement text.
- Adding new requirements.
- Rewriting specs from scratch.

## Decisions

### Decision: Use MODIFIED operation for all requirements

Since we're adding scenarios to existing requirements without changing the requirement text, each requirement uses `## MODIFIED Requirements` in the delta spec. The full requirement block (including original text + new scenarios) must be included.

**Alternative considered**: Edit spec files directly — rejected because OpenSpec changes should go through the delta spec workflow for traceability.

### Decision: One scenario per requirement minimum

Add the minimum one scenario per requirement. Some requirements naturally warrant multiple scenarios; add those where the requirement describes distinct behaviors.

## Risks / Trade-offs

- [Scenario quality] Retroactively added scenarios may be less precise than scenarios written alongside implementation → Mitigation: Scenarios can be refined when each capability is implemented.
- [Large delta] 61 modified requirements across 7 files is a large change → Mitigation: This is a one-time cleanup; all changes are additive (scenarios only).
