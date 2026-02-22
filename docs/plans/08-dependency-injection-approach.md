# Dependency Injection Approach

Date: 2026-02-21
Status: Selected for Option A

## Decision

Use **manual, typed dependency injection** through composition roots.

- No decorator/reflection IoC container in v1.
- Dependencies are wired explicitly in `frameworks-drivers/di`.
- Use case constructors depend on interfaces (ports), not concrete adapters.

## Why This Approach

1. Strong type safety with low runtime magic.
2. Easier debugging because wiring is explicit.
3. Fits Clean Architecture dependency direction.
4. Keeps bundle/runtime overhead minimal for a browser game.

## Wiring Model

## Feature Composition Root

Each feature exposes a `create<Feature>Module()` factory under:

`src/features/<feature>/frameworks-drivers/di/`

That factory:
- Instantiates infrastructure adapters
- Instantiates interface-adapter controllers/presenters
- Instantiates application use cases with injected ports
- Returns a typed module surface used by shell/bootstrap

## App Composition Root

`src/app/frameworks-drivers/di/createAppModule.ts`:

1. Builds shared infra once (clock, storage connection, actor kernel).
2. Creates each feature module using shared infra.
3. Connects cross-feature boundaries by interfaces only.
4. Exposes typed entrypoints to React shell.

## Lifecycle Scoping

1. `Singleton` (app lifetime):
- actor kernel runtime
- storage gateway
- settings repository

2. `Session scoped` (per match):
- `GameSessionActor` and child actors
- match-specific controllers/use case context

3. `Transient`:
- stateless mappers/presenters

## Example Injection Boundary

`StartMatchUseCase` depends on:
- `MatchRepositoryPort`
- `SchedulerPort`
- `IdGeneratorPort`

Concrete implementations are supplied only in `frameworks-drivers/di`.

## Guardrails

1. Domain/application cannot import from `frameworks-drivers`.
2. Controllers only call use cases, never storage/runtime APIs directly.
3. DI factories are the only place `new` may cross architectural boundaries.
