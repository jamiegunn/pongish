# Understanding Summary

Date: 2026-02-21
Status: Draft - Pending user confirmation

## Summary

- Build a browser-based Pong game using TypeScript.
- Keep the product client-only with zero backend dependencies.
- Support local game persistence (saved games/history stored on device).
- Structure code with Clean Architecture and an Actor system.
- Ensure each feature has Clean Architecture layers as direct child folders.
- Start with planning artifacts before implementation.
- Capture architectural decisions as ADRs.

## Explicit Non-Goals

- No online multiplayer.
- No user accounts or login.
- No cloud sync.
- No server-side leaderboard/API for initial release.
- No replay playback in v1.
- No PWA/offline installability in v1.

## Assumptions

- Single local player mode with AI opponent is confirmed for v1.
- Optional local two-player mode (same keyboard) is planned but can be phase 2.
- "Save games locally" means persist/load game state in browser storage (no replay system in v1).
- Desktop keyboard controls are confirmed for v1.
- UI stack is React + Canvas in TypeScript for v1.
- Delivery target is a standard web app (not installable PWA) for v1.
- Visual style is modern polished for v1.

## Open Questions

- None currently.
