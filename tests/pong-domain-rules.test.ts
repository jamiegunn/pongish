import {
  createDefaultPongGameConfig,
  createInitialPongGameState,
  startMatch,
  stepMatch
} from "@/features/pong-game/domain";

describe("pong domain rules", () => {
  test("moves the ball during running phase", () => {
    const config = createDefaultPongGameConfig();
    const initial = createInitialPongGameState(config);
    const started = startMatch(initial, config);

    const next = stepMatch(started, config, {
      leftPaddleDirection: 0,
      deltaMs: 16.67,
      random01: 0.42
    });

    expect(next.ball.position.x).not.toBe(started.ball.position.x);
  });

  test("awards point to left side when ball exits right boundary", () => {
    const config = createDefaultPongGameConfig();
    const initial = createInitialPongGameState(config);
    const started = startMatch(initial, config);

    const forcedState = {
      ...started,
      phase: "running" as const,
      ball: {
        ...started.ball,
        position: {
          x: config.width + started.ball.radius + 2,
          y: config.height / 2
        },
        velocity: {
          x: 120,
          y: 0
        }
      }
    };

    const scored = stepMatch(forcedState, config, {
      leftPaddleDirection: 0,
      deltaMs: 16.67,
      random01: 0.84
    });

    expect(scored.score.left).toBe(started.score.left + 1);
    expect(scored.lastScoredBy).toBe("left");
  });
});
