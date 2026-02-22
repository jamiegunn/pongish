# System Requirements

Date: 2026-02-21

## Functional Requirements

1. Start a new Pong match from browser UI.
2. Support paddle movement controls for player input.
3. Simulate ball physics with wall/paddle collisions.
4. Track score and match state (serve, rally, point, game over).
5. Pause and resume gameplay.
6. Save in-progress game locally.
7. Load previously saved game locally.
8. List previously saved games with timestamp/metadata.
9. Delete saved games.
10. Configure basic settings (winning score, paddle speed, ball speed, AI difficulty).

## Default Gameplay Rules (v1)

1. Default winning score is `7`.
2. Game auto-pauses when browser tab/window loses focus.

## UX Direction (v1)

1. Modern polished visual style.

## Constraints

1. No backend services, websockets, or API dependencies.
2. No login/authentication.
3. Entire runtime is browser-only.
4. TypeScript codebase.
5. Clean Architecture enforced per feature.
6. Actor model for runtime behavior orchestration.

## Suggested Feature Slices

1. `pong-game` (core gameplay loop and rules)
2. `saved-games` (persistence and recovery)
3. `settings` (game config and validation)
4. `shell` (menus/routing/UI composition)
