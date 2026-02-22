# ADR-0005: Use React for UI Shell and Canvas for Gameplay Rendering

## Status

Accepted

## Context

The game is browser-only and must use TypeScript. v1 scope is AI-only Pong on desktop keyboard controls, with local save/load. Rendering choices must balance maintainability and real-time performance.

## Decision Drivers

- Consistent component model for menus/settings/save slots
- Efficient real-time rendering for paddle/ball animation
- Clear separation between UI shell and game loop concerns
- Strong TypeScript ecosystem for tooling/testing

## Considered Options

### Option 1: React + Canvas (selected)

- Pros: Strong UI composition with performant draw surface for gameplay.
- Cons: Requires coordination between React state and canvas loop boundaries.

### Option 2: Canvas + minimal DOM (no React)

- Pros: Lower runtime overhead and simpler render path.
- Cons: Less ergonomic for non-game UI flows.

### Option 3: React DOM-only rendering (no Canvas)

- Pros: Single rendering model.
- Cons: Less suitable for smooth 60 FPS game animation under UI re-render pressure.

## Decision

Use React for shell/interface flows and Canvas for gameplay rendering, both in TypeScript.

## Consequences

### Positive

- Better maintainability for menus/settings/save management.
- Canvas loop can remain independent and deterministic.

### Negative

- Integration complexity at boundary between React event/state layer and actor-driven simulation.

## Related Decisions

- ADR-0002 actor runtime
- ADR-0004 client-only boundary
