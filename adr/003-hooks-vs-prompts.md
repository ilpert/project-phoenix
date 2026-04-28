# ADR-003: Hook for Hard ACL Enforcement vs CLAUDE.md for Preference Expression

**Status:** Accepted  
**Date:** 2026-04-28  
**Deciders:** Architecture team  

---

## Context

We need two things from Claude when working in this repo:

1. **Hard invariant:** The fields `albumId` and `releaseYear: string` must never appear in `services/`. This is a binary rule with no exceptions.

2. **Directional preference:** New album features should be built in `services/album-catalog/`, not added to the monolith. This requires judgment — "new album feature" is not always obvious, and a hard block would generate false positives.

Claude Code offers two mechanisms:
- **PreToolUse hook** (`.claude/settings.json`): A shell command that runs before every tool execution. Exit code 2 blocks the tool. Deterministic.
- **CLAUDE.md instruction**: Natural language in the context window. Claude reads it and applies judgment. Advisory.

---

## Decision

**Use both, for different things.**

| Rule | Mechanism | Why |
|------|-----------|-----|
| `albumId` must not appear in `services/` API | PreToolUse hook | Binary invariant. No valid exception. Hook is deterministic — it cannot be reasoned around, misunderstood, or forgotten in a long context window. |
| `releaseYear` must be `number` not `string` in `services/` | PreToolUse hook | Same — binary, no exception, type correctness is unambiguous. |
| "Prefer `services/album-catalog/` for new album features" | CLAUDE.md | Requires judgment. What counts as "new"? What counts as "album feature"? A hook cannot answer these questions. CLAUDE.md provides the preference; Claude applies contextual reasoning. |

---

## Why Hook for the Hard Boundary

A CLAUDE.md instruction is advisory. Under time pressure, with a long conversation history, or when context has been compacted, an LLM may miss or de-prioritize it. The hook runs on every single `Write` and `Edit` tool call regardless of context state. It is not in the context window — it is in the execution pipeline.

The hook also produces a specific, actionable error message: it names the exact violation and points to the ADR. This is better than a vague "that's not allowed" from a prompt-only approach.

---

## Why CLAUDE.md for the Preference

The preference "use the new service for new album features" encodes an architectural direction, not a binary invariant. Consider:
- Adding a "featured album" flag — new feature, goes in album-catalog
- Fixing a bug in the monolith's album seeding — maintenance, stays in monolith
- Adding a cross-cutting audit log — not obviously in either; requires judgment

A hook that tries to encode "new feature" would either over-block (frustrating) or under-block (useless). CLAUDE.md expresses the direction and trusts Claude to apply it with context.

---

## Consequences

**Positive:**
- Hard invariants are enforced regardless of context state or session length
- Preference guidance is available to Claude without adding rigidity
- The ADR itself documents why each mechanism was chosen — future developers don't guess

**Negative:**
- Two systems for one conceptual goal — developers must understand both
- The hook is a heuristic (string scan) — a sophisticated violation could evade it. The contract test is the authoritative check.
- If the preference needs to become a hard rule (e.g., monolith is frozen), promoting it from CLAUDE.md to a hook is a deliberate action with a clear rationale

**The general principle:**
> Use a hook when the rule is binary and exceptions are never valid.  
> Use CLAUDE.md when the rule requires judgment or has edge cases.  
> Document why you chose each, so future maintainers can make the same distinction.
