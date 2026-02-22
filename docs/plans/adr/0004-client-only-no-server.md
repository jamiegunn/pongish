# ADR-0004: Keep Product Client-Only with No Authentication

## Status

Accepted

## Context

The product requirement is explicit: web-based Pong with no server-side interactivity and no login.

## Decision Drivers

- Fast delivery and low operational overhead
- Privacy-friendly local data model
- Offline-capable architecture potential
- Simpler deployment

## Considered Options

### Option 1: Pure client-side architecture (selected)

- Pros: Zero backend maintenance, minimal infrastructure.
- Cons: No cross-device sync, no online multiplayer.

### Option 2: Optional backend for sync/leaderboards

- Pros: Cloud persistence and social features.
- Cons: Violates current scope and adds operational burden.

## Decision

Ship v1 as a fully client-only application with local persistence and no authentication flow.

## Consequences

### Positive

- Simpler build and deployment.
- Lower cost and reduced attack surface.

### Negative

- Data is tied to browser/device unless exported manually in the future.

## Related Decisions

- ADR-0003 local persistence technology
