# ADR-0001: Use Clean Architecture Layers Under Each Feature

## Status

Accepted

## Context

The project must use TypeScript and Clean Architecture, and each feature must expose Clean Architecture layers as direct child folders under the feature name.

## Decision Drivers

- Strong separation of concerns
- High testability of core logic
- Enforced dependency direction
- Clear feature ownership and scaling

## Considered Options

### Option 1: Feature-first Clean Architecture (selected)

- Pros: Matches explicit requirement; clear boundaries and locality.
- Cons: Some duplication across features (ports/utilities).

### Option 2: Global layer-first architecture

- Pros: Centralized shared code.
- Cons: Violates requested folder mapping, increases cross-feature coupling.

## Decision

Adopt feature-first structure where each feature contains `domain`, `application`, `interface-adapters`, and `frameworks-drivers` folders directly underneath it.

## Consequences

### Positive

- Architecture constraints become visible in folder layout.
- Easier isolated testing and onboarding.

### Negative

- Shared concerns require deliberate extraction strategy to avoid duplication.

## Related Decisions

- ADR-0002 actor runtime choice
- ADR-0004 client-only boundary
