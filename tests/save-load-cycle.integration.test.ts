import type { SharedDependencies } from "@/app/frameworks-drivers/di/module-types";
import { createPongGameModule } from "@/features/pong-game/frameworks-drivers/di/createPongGameModule";
import { isGameSessionSnapshot } from "@/features/pong-game/application";
import { createSavedGamesModule } from "@/features/saved-games/frameworks-drivers/di/createSavedGamesModule";
import { createActorRuntime } from "@/shared/actors/runtime";
import type { ClockPort } from "@/shared/clock/clock";
import type { StorageGateway } from "@/shared/storage/storage";

class MemoryStorageGateway implements StorageGateway {
  private readonly map = new Map<string, string>();

  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }

  remove(key: string): void {
    this.map.delete(key);
  }
}

class FixedClock implements ClockPort {
  nowMs(): number {
    return 1_000;
  }
}

const createSharedDependencies = (): SharedDependencies => {
  return {
    actorRuntime: createActorRuntime(),
    clock: new FixedClock(),
    storage: new MemoryStorageGateway()
  };
};

describe("save/load integration", () => {
  test("saves snapshot and loads it into a new session", async () => {
    const deps = createSharedDependencies();
    const pongModule = createPongGameModule(deps);
    const savedGamesModule = createSavedGamesModule(deps);

    const firstSession = pongModule.createSession();
    firstSession.start();
    firstSession.tick(16.67);
    firstSession.tick(16.67);

    const saveSummary = await savedGamesModule.saveGame({
      source: "manual",
      payload: firstSession.exportSnapshot(),
      label: "Test Save"
    });

    const list = await savedGamesModule.listGames();
    expect(list.some((item) => item.id === saveSummary.id)).toBe(true);

    const savedRecord = await savedGamesModule.loadGame(saveSummary.id);
    expect(savedRecord).not.toBeNull();
    expect(isGameSessionSnapshot(savedRecord?.payload)).toBe(true);

    const secondSession = pongModule.createSession();
    secondSession.loadSnapshot(savedRecord?.payload as unknown as ReturnType<typeof firstSession.exportSnapshot>);

    const firstSnapshot = firstSession.exportSnapshot();
    const secondSnapshot = secondSession.exportSnapshot();

    expect(secondSnapshot.config.winningScore).toBe(firstSnapshot.config.winningScore);
    expect(secondSnapshot.state.score.left).toBe(firstSnapshot.state.score.left);
    expect(secondSnapshot.state.score.right).toBe(firstSnapshot.state.score.right);
  });
});
