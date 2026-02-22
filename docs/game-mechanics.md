# re-Pong Game Mechanics

This document lists the gameplay and presentation rules currently implemented in code.

## Match Flow

- The user lands on a welcome panel first and must click `Enter Arena`.
- The game does not start automatically on render.
- In-arena ready overlay text is: `Press Start/Select to Start`.
- Starting a round requires:
  - `Space`, `Enter`, or `Start Match` button.
  - A 3-second countdown (`3, 2, 1`) with countdown beeps.
- After the countdown:
  - If phase is `paused`, the game resumes.
  - Otherwise, a new match starts.
- On score (without match end), phase moves to `paused`, then another 3-second countdown occurs before play continues.
- On window blur, the game auto-pauses.

## Arena and Default Config

- Arena size default: `1440 x 675` (wider/taller playfield).
- Winning score default: `7`.
- Paddle defaults:
  - Width `14`
  - Height `96`
  - Inset `36`
  - Player speed `520`
  - AI tracking speed `470`
- Ball defaults:
  - Radius `9`
  - Base speed `440`
- Powerups are enabled by default.

## Controls

- Move paddle: `W/S` or `Arrow Up/Arrow Down`.
- Start / Pause / Resume: `Space`.
- Start countdown: `Enter` (also works as start trigger).
- Activate manual powerup (player): `E`.
- Activate one-time mortality: `M`.
- Toggle heatmap: `H`.

## State and Timing

- Match phases: `idle`, `running`, `paused`, `completed`.
- Simulation runs with a fixed step of `1/60s` (`16.67ms`).
- Per-frame input delta is clamped to max `50ms`.
- Physics updates only occur during `running`.

## Serve, Scoring, and Win Rules

- Serve velocity is created with horizontal speed = `ballSpeed` and vertical factor alternating between `+0.34` and `-0.34` by serve count.
- If ball exits left boundary, right side scores (unless blocked by mortality/shield).
- If ball exits right boundary, left side scores (unless blocked by shield).
- After a non-winning point:
  - Ball is reset to center with next serve direction based on who scored.
  - Timed powerup effects are cleared.
  - Mortality active mode resets to `none`.
- At winning score:
  - Phase becomes `completed`.
  - Winner is set.
  - Ball is centered and stopped.
  - Pending manual powerups and timed effects are cleared.

## Ball Physics, Speed Ramp, and Spin

- Top and bottom wall collisions reflect Y velocity and damp spin (`spin *= 0.92`).
- Velocity is clamped to max magnitude per axis of `ballSpeed * 20`.
- User paddle hit behavior:
  - Ball X and Y velocity are both multiplied by `1.25` (speed ramp on player paddle hit only).
  - Additional reflection multiplier is applied on X (`* 1.02`) before ramp.
- AI paddle hit behavior:
  - Standard reflection with `* 1.02` on X, no 1.25 ramp.
  - Ignored if mortality mode is `unstoppable-shot`.
- Spin/curve behavior:
  - Paddle movement and impact offset inject spin.
  - Spin bends trajectory over time (curved flight, not just angled bounce).
  - Spin decays continuously each frame.

## AI Behavior

- AI direction tracks ball Y against paddle center with a small deadzone.
- AI movement speed is `aiTrackingSpeed`, then modified by active powerups (slow/speed burst).
- AI can auto-activate its pending manual powerup probabilistically during runtime.

## Powerups

- First drop after `5.5s`.
- Subsequent drops random between `7.5s` and `13.5s`.
- Drop side is random (`left` or `right`).
- Drop type split:
  - Auto powerup roughly 58%.
  - Manual powerup roughly 42%.
- Timed powerups last `6000ms`.
- Powerup announcements display for `2200ms`.

### Auto Powerups

- `paddle-grow`:
  - Applied to recipient side.
  - Paddle height multiplier: `1.45x`.
- `slow-opponent`:
  - Applied to opposing side.
  - Paddle speed multiplier: `0.68x`.
- `chaos-curve`:
  - Instant ball chaos effect.
  - Increases X speed (`*1.08`), perturbs Y velocity, and injects extra spin.

### Manual Powerups

- Manual types: `shield`, `speed-burst`.
- Player activates pending manual via `E`.
- AI can auto-activate its pending manual.
- `shield`:
  - Adds one shield charge to side.
  - If that side would concede, one charge is consumed and ball is bounced back instead of scoring.
- `speed-burst`:
  - Timed effect on recipient side.
  - Paddle speed multiplier: `1.55x`.

## Mortality (One-Time Per Match)

- Player can trigger mortality once per match with `M` while running.
- Mortality modes:
  - `no-ai-score`: if AI is controlling rally and player is not yet about to return.
  - `unstoppable-shot`: default fallback and near-player-return situation.
- Effects:
  - `no-ai-score`: if ball crosses player goal line, the score is blocked and ball is bounced back.
  - `unstoppable-shot`: AI paddle cannot return the player's outbound shot.
- Mortality availability is consumed immediately on activation.
- Active mortality mode resets after point resolution.

## Audio Rules

- Audio is WebAudio-based synthesized "MIDI-like" playback (no external server needed).
- Background music:
  - Plays only when `startSequence === started` and phase is `running` or `paused`.
  - Does not play on ready screen.
  - Does not play during countdown.
  - Tempo scales with current ball speed.
  - Includes bass, lead, harmony, and chord layers.
- Collision blips:
  - Subtle blip on wall collisions.
  - Subtle blip on paddle collisions.
- Score sounds:
  - Player score: success-style rising cue.
  - Player conceded on: "whomp-whomp" style descending cue.
- Powerup activation sounds:
  - Distinct sound cue for player activation.
  - Distinct sound cue for AI activation.

## UI Feedback Rules

- Heatmap can be toggled on/off (keyboard `H` or UI button).
- Heatmap is intentionally subtle and tracks recent ball path.
- Paddle visuals reflect active powerups (grow/speed/slowed/shield).
- Mortality modes tint edge barriers for immediate visual clarity.
- Powerup announcements appear in the top toolbar feed and auto-hide after about 2 seconds.
- Layout is designed to avoid page scrolling (`html`, `body`, and app containers use `overflow: hidden`).

## Settings That Affect Gameplay

- User-configurable:
  - Winning score (`1-21`)
  - Paddle speed (`250-900`)
  - Ball speed (`200-900`)
  - AI difficulty (`1-10`)
- AI tracking speed is derived from settings:
  - `aiTrackingSpeed = round(ballSpeed * (0.45 + aiDifficulty * 0.08))`

## Persistence

- No server-side gameplay interactions.
- Saved-games gameplay UI is removed from the active play flow.

