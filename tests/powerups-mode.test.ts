import {
  activatePendingPowerup,
  createDefaultPongGameConfig,
  createInitialPongGameState,
  startMatch,
  stepMatch
} from "@/features/pong-game/domain";

describe("powerups", () => {
  test("spawns manual powerups and allows player activation", () => {
    const config = {
      ...createDefaultPongGameConfig(),
      winningScore: 99
    };
    const started = startMatch(createInitialPongGameState(config), config);
    const state = stepMatch(
      {
        ...started,
        powerups: {
          ...started.powerups,
          nextDropInMs: 0
        }
      },
      config,
      {
        leftPaddleDirection: 0,
        deltaMs: 16.67,
        random01: 0.3
      }
    );

    expect(state.powerups.pendingManual.left).toBe("shield");

    const activated = activatePendingPowerup(state, "left");

    expect(activated.powerups.pendingManual.left).toBeNull();
    expect(activated.powerups.shieldCharges.left).toBeGreaterThan(0);
  });

  test("spawns auto powerups that can affect either side", () => {
    const config = {
      ...createDefaultPongGameConfig(),
      winningScore: 99
    };
    const started = startMatch(createInitialPongGameState(config), config);
    const state = stepMatch(
      {
        ...started,
        powerups: {
          ...started.powerups,
          nextDropInMs: 0
        }
      },
      config,
      {
        leftPaddleDirection: 0,
        deltaMs: 16.67,
        random01: 0.2
      }
    );

    const hasAutoEffect = state.powerups.timedEffects.length > 0 || state.powerups.announcement !== null;

    expect(hasAutoEffect).toBe(true);
  });
});
