# Performance and Statefulness Plan

Date: 2026-02-21

## Performance Targets (v1)

1. Render target: 60 FPS on modern desktop browsers.
2. Simulation tick: fixed 16.67ms equivalent (with catch-up cap).
3. Input-to-frame latency target: <= 50ms on desktop.
4. Save/load operation target: <= 100ms for typical game state payload.

## State Model

## Volatile Runtime State

- Current match actors and mailbox queues.
- Real-time physics state.
- Current input state.

## Durable Local State

- Game settings.
- Saved in-progress games.
- Saved completed match summaries.

## Persistence Strategy

1. Primary: IndexedDB for structured local saves and future extensibility.
2. Optional lightweight fallback: localStorage for settings only.
3. Save schema includes:
- `saveId`, `createdAt`, `updatedAt`
- `gameConfig`
- actor snapshot bundle (ball, paddles, score, phase)
- no replay event log in v1

## Reliability Expectations

- On browser refresh, user can recover last autosave.
- Corrupt save entry should be skipped with user-visible error state.
- Failed save should not interrupt active match.
