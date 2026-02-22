# Feature State and Recommendations

Last updated: 2026-02-22

## Summary

| Feature | Status | Current State | Recommendation |
|---|---|---|---|
| `pong-game` | Implemented | Actor-driven session, deterministic domain rules, Canvas rendering, AI paddle, powerups, mortality, audio modes, countdown, pause/resume, blur auto-pause. | Add more protocol tests for edge-case transitions (countdown to pause to resume loops) and add targeted corruption-recovery tests on imported snapshots. |
| `settings` | Implemented | Local-storage backed settings with validation and reset defaults. Applied settings seed a new play session. | Consider explicit "dirty state" indicator before apply for better UX and easier testing of no-op changes. |
| `shell` | Implemented | Play and Settings tabs, keyboard-accessible tab navigation, welcome panel flow into match session. | Keep shell minimal for v1; if new tabs are added, add route/state transition protocol tests. |
| `saved-games` | Implemented in domain/application/adapters | IndexedDB repository with memory fallback, use cases for save/autosave/list/load/delete; integration test exists. | Decide whether to expose save/load UI in shell for v1. If deferred, document it as intentionally hidden runtime capability. |
| `app` composition + shared runtime | Implemented | Manual typed DI composition root, shared actor runtime, clock and storage ports. | Add a lightweight architecture conformance check (import boundary rule or static test) to prevent accidental outward dependency drift. |

## Details

### `pong-game`

- Clean layers are present and used.
- Domain logic is deterministic and framework-agnostic.
- UI behavior includes overlays, power-up HUD integration, and keyboard shortcuts.
- Performance sanity coverage exists in `tests/pong-session-performance.test.ts`.

### `settings`

- Validation constraints are centralized in `domain/rules.ts`.
- Repository parses and merges stored values safely with defaults.
- UI reflects validation errors and status messages.

### `shell`

- Navigation stays focused on view selection (`play` and `settings`).
- Presenter-managed tab metadata enables keyboard navigation in top bar.

### `saved-games`

- Repository supports IndexedDB and memory fallback for non-browser contexts.
- Save metadata tracks `createdAtMs` and `updatedAtMs`.
- Autosave ID is stable at the use-case layer.

### Shared Platform

- Actor runtime mailbox is FIFO and explicitly flushed.
- Shared dependencies are composed in a single app root for clear ownership.

