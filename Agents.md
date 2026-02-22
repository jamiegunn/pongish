# Agents.md

Project: Web Pong (TypeScript, Clean Architecture, Actor model)
Date: 2026-02-21

## Project Rules

1. Keep all planning and task artifacts in `/docs/plans/`.
2. Do not introduce server-side components for v1.
3. Do not implement authentication or login flows.
4. Persist game data locally in browser storage only.
5. Architecture Decision Requirements should be under /docs/adr

## Architecture Rules

1. Use feature-first foldering under `src/features`.
2. Under every feature, keep these direct child folders:
- `domain`
- `application`
- `interface-adapters`
- `frameworks-drivers`
3. Enforce inward dependency direction only.
4. Keep domain logic framework-agnostic and deterministic.

## Actor System Rules

1. Runtime behavior is message-driven.
2. Use typed actor messages and explicit state transitions.
3. Keep actor responsibilities focused (single reason to change).
4. Persist through adapter ports, never directly from domain logic.

## ADR Rules

1. Record significant architecture decisions in `plans/adr/`.
2. Use incremental numbering (`0001`, `0002`, ...).
3. Update `plans/adr/README.md` index when adding/superseding ADRs.

## Testing and Quality Expectations

1. Unit test domain and application logic.
2. Add protocol tests for actor message/state transitions.
3. Validate save/load flows and corruption handling paths.
4. Track performance against planning targets in `docs/plans/05-performance-statefulness-plan.md`.

## Do not trust yourself

1. Review and iterate on all assumptions.  Always ask questions if needed, by giving your recommendation and in your questions, give tradeoffs and consisterations.
2. Break all work items into small tasks.  All tasks should be listed under /plans
3. Consistently document current state of features along with recommendations in /docs/features.md
