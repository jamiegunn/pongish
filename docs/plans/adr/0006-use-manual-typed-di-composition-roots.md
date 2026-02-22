# ADR-0006: Use Manual Typed Dependency Injection via Composition Roots

## Status

Accepted

## Context

Option A (feature-local Clean Architecture + shared actor kernel) needs a predictable way to wire ports to adapters in a browser-only TypeScript app.

## Decision Drivers

- Explicit, inspectable wiring
- Strong compile-time typing
- Low runtime overhead
- Clean Architecture boundary enforcement

## Considered Options

### Option 1: Manual typed DI in composition roots (selected)

- Pros: simple, explicit, test-friendly, no runtime reflection.
- Cons: more boilerplate than automatic containers.

### Option 2: Decorator/reflection IoC container

- Pros: less visible wiring code.
- Cons: runtime magic, more complexity, potential bundle overhead.

### Option 3: Service locator

- Pros: easy access to dependencies.
- Cons: hidden coupling and weaker test clarity.

## Decision

Use manual typed DI. Each feature wires dependencies in `frameworks-drivers/di`, with app-level composition at bootstrap.

## Consequences

### Positive

- Easy to reason about dependency graph.
- Good fit for deterministic game runtime and test seams.

### Negative

- Requires disciplined module factory conventions.

## Related Decisions

- ADR-0001 Clean Architecture per feature
- ADR-0002 actor runtime orchestration
