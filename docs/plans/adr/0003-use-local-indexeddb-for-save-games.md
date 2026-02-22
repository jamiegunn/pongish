# ADR-0003: Use IndexedDB for Local Save Games

## Status

Accepted

## Context

The project requires local-only game saving, with no backend and no authentication.

## Decision Drivers

- Structured local data storage
- Async API for non-blocking saves
- Capacity headroom over localStorage
- Browser support for modern environments

## Considered Options

### Option 1: IndexedDB (selected)

- Pros: Better data volume and structure, async, good for save history.
- Cons: More verbose API and migration/versioning concerns.

### Option 2: localStorage only

- Pros: Simpler API.
- Cons: Blocking calls, low capacity, weak query patterns.

## Decision

Store saved games and save metadata in IndexedDB. Use localStorage only for lightweight preferences if needed.

## Consequences

### Positive

- Better scalability for multiple save slots/history.
- Cleaner persistence boundary for future features.

### Negative

- Requires storage adapter abstraction and migration logic.

## Related Decisions

- ADR-0004 client-only boundary
