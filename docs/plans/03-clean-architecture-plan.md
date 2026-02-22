# Clean Architecture Plan

Date: 2026-02-21

## Rule: Layers Directly Under Feature

Each feature folder contains Clean Architecture layers as direct children.

```text
src/
  features/
    pong-game/
      domain/
      application/
      interface-adapters/
      frameworks-drivers/
    saved-games/
      domain/
      application/
      interface-adapters/
      frameworks-drivers/
    settings/
      domain/
      application/
      interface-adapters/
      frameworks-drivers/
    shell/
      domain/
      application/
      interface-adapters/
      frameworks-drivers/
```

## Layer Responsibilities

1. `domain/`
- Entities, value objects, domain services, domain events.
- Pure TypeScript logic, no browser/API/framework dependencies.

2. `application/`
- Use cases and orchestration policies.
- Defines ports/interfaces consumed from outer layers.

3. `interface-adapters/`
- Presenters, controllers, mappers, DTO transformations.
- Bridges UI intents and app use cases.

4. `frameworks-drivers/`
- React components, browser APIs, IndexedDB adapters, timer adapters.
- Concrete implementations of application ports.

## Dependency Direction

- Allowed: `frameworks-drivers -> interface-adapters -> application -> domain`
- Forbidden: inward layers importing outward layers.

## Composition Root

- App bootstrap wires concrete adapters into use cases per feature.
- Composition files live under each feature's `frameworks-drivers/di`.
- DI style is manual typed factories (no reflection IoC container in v1).
