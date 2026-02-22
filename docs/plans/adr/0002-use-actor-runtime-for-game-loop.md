# ADR-0002: Use Actor Runtime for Match State and Orchestration

## Status

Accepted

## Context

Pong gameplay needs deterministic updates, concurrent concerns (input, physics, scoring, persistence), and maintainable state transitions.

## Decision Drivers

- Deterministic behavior and testability
- Isolation of responsibilities
- Explicit message-driven state changes
- Fault isolation for non-critical components

## Considered Options

### Option 1: Actor model with typed messages (selected)

- Pros: Clear ownership, deterministic protocol tests, resilient orchestration.
- Cons: Higher upfront complexity than direct mutable loop.

### Option 2: Single mutable game store with reducer loop

- Pros: Simpler start.
- Cons: Weaker isolation and scaling for additional runtime concerns.

## Decision

Use an actor system for runtime orchestration with typed messages and deterministic tick processing.

## Consequences

### Positive

- Modular runtime components.
- Easier debugging via message history.

### Negative

- Requires disciplined message/schema design.

## Related Decisions

- ADR-0001 Clean Architecture layout
- ADR-0003 local persistence approach
