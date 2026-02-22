# ADR-0007: Replace Mayhem Mode with Unified Random Powerup System

## Status

Accepted

## Context

Gameplay originally introduced a dedicated Mayhem mode for chaotic events. Product direction changed to remove Mayhem from user-facing mode selection while retaining dynamic in-match variation.

## Decision Drivers

- Keep onboarding and mode selection simpler
- Preserve high gameplay variety
- Maintain deterministic, testable domain rules
- Keep UI cues clear for both automatic and manual effects

## Considered Options

### Option 1: Keep Mayhem mode and add powerups

- Pros: maximum variety and explicit chaos mode.
- Cons: extra UX complexity and overlapping concepts.

### Option 2: Remove Mayhem and use a single random powerup system (selected)

- Pros: simpler mode model, fewer branching UI states, still dynamic gameplay.
- Cons: less explicit opt-in for chaos behavior.

### Option 3: Remove both Mayhem and powerups

- Pros: simplest ruleset.
- Cons: reduced replay variety and less gameplay identity.

## Decision

Use one primary runtime mode with random powerup drops. Powerups can be automatic or manual, can affect either side, and are surfaced via UI announcements and activation prompts.

## Consequences

### Positive

- Cleaner user flow and less mode-driven branching.
- Better consistency between game state, presenter, and UI controls.
- Easier testing surface than parallel mode-specific behavior trees.

### Negative

- Less explicit player control over chaos intensity.
- Requires stronger in-match communication (banners/prompts) to explain state changes.

## Related Decisions

- ADR-0002 actor runtime orchestration
- ADR-0005 React + Canvas presentation model
