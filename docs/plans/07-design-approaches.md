# Design Approaches

Date: 2026-02-21
Status: Selected - Approach A

## Approach A (Recommended): Feature-Local Clean Layers + Shared Actor Kernel

## Summary

- Keep each feature (`pong-game`, `saved-games`, `settings`, `shell`) fully layered with direct child folders:
  - `domain`
  - `application`
  - `interface-adapters`
  - `frameworks-drivers`
- Implement one lightweight shared actor kernel in `src/shared/actors` (mailbox, scheduler, actor refs, typed envelopes).
- Each feature defines its own actor implementations and message contracts in its own folders.
- React UI lives in feature `frameworks-drivers` and communicates through feature controllers/use cases.

## Pros

- Strong alignment with your Clean Architecture folder rule.
- Actor runtime complexity is centralized once, behavior remains feature-owned.
- Scales well for post-v1 features without rewriting core runtime.

## Cons

- Slight upfront design effort to define shared kernel APIs.

## Approach B: Fully Feature-Isolated Actor Runtime per Feature

## Summary

- Every feature implements its own actor runtime primitives (scheduler/mailbox/dispatch).
- No shared runtime package; strict isolation everywhere.

## Pros

- Maximum feature independence.
- Very explicit ownership boundaries.

## Cons

- Repeated infrastructure logic and inconsistent runtime behavior risk.
- Higher maintenance and testing cost.

## Approach C: Single Global Game Store + Actor-Like Modules

## Summary

- Use a centralized app store for state and treat modules as actor-like handlers.
- Keep message concepts but route through one global reducer/store pipeline.

## Pros

- Lower initial complexity and faster bootstrap.
- Simpler debugging with one state tree.

## Cons

- Weaker actor isolation and fault boundaries.
- More coupling between gameplay, persistence, and UI concerns.

## Recommendation

Choose **Approach A**. It gives the cleanest balance of architecture rigor, maintainability, and delivery speed for your v1 constraints.
