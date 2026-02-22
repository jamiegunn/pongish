# Actor System Plan

Date: 2026-02-21

## Runtime Actor Topology (v1)

1. `GameSessionActor`
- Parent coordinator for a single match.
- Owns lifecycle: `Idle -> Running -> Paused -> Completed`.

2. `BallActor`
- Maintains ball position/velocity.
- Handles tick updates and bounce outcomes.

3. `PaddleActor:left` and `PaddleActor:right`
- Own paddle state and movement limits.
- React to input intents or AI intents.

4. `ScoreActor`
- Tracks score, serve side, winning condition.
- Emits `MatchCompleted` events.

5. `InputActor`
- Normalizes keyboard/touch input into deterministic commands.

6. `PersistenceActor`
- Handles save/load/delete/list commands.
- Serializes snapshots/events to local storage adapter.

7. `UiProjectionActor`
- Builds UI-ready view models from domain/app events.

## Core Messages (Typed)

- `StartMatch(config)`
- `Tick(deltaMs)`
- `MovePaddle(side, direction, magnitude)`
- `BallCollision(target)`
- `PointScored(side)`
- `PauseMatch`
- `ResumeMatch`
- `SaveGame(slotId?)`
- `LoadGame(saveId)`
- `DeleteSavedGame(saveId)`

## Scheduling Model

- `requestAnimationFrame` drives frame cadence.
- Fixed simulation timestep (for determinism) with accumulator.
- Actor mailboxes processed in deterministic order per tick.

## Fault Boundaries

- Actor message handling is isolated per actor.
- Persistence failures emit recoverable UI events (no app crash).
