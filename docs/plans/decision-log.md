# Decision Log

Date: 2026-02-22

## D-001: v1 Game Mode Scope

- Decision: v1 will support AI opponent mode only.
- Alternatives considered:
1. AI + local two-player
2. Local two-player only
- Why chosen: smallest reliable scope for first delivery while preserving future extension path.

## D-002: v1 Input Platform Scope

- Decision: v1 will support desktop keyboard input only.
- Alternatives considered:
1. Desktop + mobile touch in v1
2. Desktop first, mobile immediately after v1
- Why chosen: controls and physics tuning are simpler and lower risk for first release.

## D-003: v1 Save Feature Scope

- Decision: v1 will support game state save/load only, without replay playback.
- Alternatives considered:
1. Save/load + replay playback
2. Save/load + replay playback + export/import
- Why chosen: keeps persistence simple and focused on core requirement.

## D-004: v1 UI Technology Stack

- Decision: v1 will use TypeScript + React + Canvas rendering.
- Alternatives considered:
1. TypeScript + Canvas + minimal DOM (no React)
2. TypeScript + React without Canvas (DOM rendering)
- Why chosen: keeps UI composition flexible while using Canvas where Pong rendering is most efficient.

## D-005: v1 Packaging Scope

- Decision: v1 will ship as a standard web app, without PWA/offline installability.
- Alternatives considered:
1. Full PWA support in v1
2. Delay PWA to post-v1
- Why chosen: keeps v1 focused on core gameplay and local persistence requirements.

## D-006: Default Winning Score

- Decision: default match winning score is `7`.
- Alternatives considered:
1. `11`
2. `21`
- Why chosen: shorter sessions for faster repeat play in v1.

## D-007: Focus Loss Behavior

- Decision: game will auto-pause when tab/window loses focus.
- Alternatives considered:
1. Keep simulation running in background
2. User-configurable toggle with default on
- Why chosen: prevents unfair point loss and preserves expected local-play behavior.

## D-008: v1 Visual Direction (Superseded)

- Decision: v1 visual style was modern polished.
- Alternatives considered:
1. Minimal arcade
2. Retro CRT style
- Why chosen at the time: prioritized high-fidelity presentation for menus and gameplay shell.

## D-009: Dependency Injection Strategy

- Decision: use manual typed DI via composition roots (`frameworks-drivers/di`) with no reflection/decorator IoC container in v1.
- Alternatives considered:
1. Runtime IoC container with decorators/reflection
2. Hybrid service locator pattern
- Why chosen: explicit wiring, low complexity, predictable browser runtime behavior, and strong TypeScript typing.

## D-010: Selected Architecture Approach

- Decision: select Approach A from `plans/07-design-approaches.md`.
- Alternatives considered:
1. Approach B: fully feature-isolated actor runtimes
2. Approach C: single global game store with actor-like modules
- Why chosen: best balance of clean boundaries, shared runtime primitives, and implementation speed.

## D-011: Remove Mayhem as Runtime Mode

- Decision: remove Mayhem mode and shift chaos behavior into random powerups.
- Alternatives considered:
1. Keep Mayhem as a separate mode
2. Keep both Mayhem and powerups
- Why chosen: simplifies user flow and keeps one primary mode while preserving varied gameplay events.

## D-012: Default UI Treatment

- Decision: set Retro Cabinet as default treatment.
- Alternatives considered:
1. Minimal arcade
2. Modern polished
- Why chosen: aligns with intended arcade personality while keeping implementation lightweight.
