import { PongGameSessionUseCase } from "@/features/pong-game/application";

describe("pong session performance checks", () => {
  test("handles long-running fixed-step simulation within stability threshold", () => {
    const session = new PongGameSessionUseCase();
    session.dispatch({ type: "start" });

    const start = performance.now();

    for (let i = 0; i < 1_200; i += 1) {
      session.dispatch({
        type: "tick",
        deltaMs: 16.67
      });
    }

    const elapsedMs = performance.now() - start;
    const snapshot = session.getSnapshot();

    expect(elapsedMs).toBeLessThan(1_000);
    expect(Number.isFinite(snapshot.state.ball.position.x)).toBe(true);
    expect(Number.isFinite(snapshot.state.ball.position.y)).toBe(true);
  });
});
