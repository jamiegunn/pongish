import type { AppModule, SharedDependencies } from "@/app/frameworks-drivers/di/module-types";
import { createPongGameModule } from "@/features/pong-game/frameworks-drivers/di/createPongGameModule";
import { createSettingsModule } from "@/features/settings/frameworks-drivers/di/createSettingsModule";
import { createShellModule } from "@/features/shell/frameworks-drivers/di/createShellModule";
import { createActorRuntime } from "@/shared/actors/runtime";
import { BrowserClock } from "@/shared/clock/clock";
import { BrowserStorageGateway } from "@/shared/storage/storage";

const createSharedDependencies = (): SharedDependencies => {
  return {
    actorRuntime: createActorRuntime(),
    clock: new BrowserClock(),
    storage: new BrowserStorageGateway()
  };
};

export const createAppModule = (): AppModule => {
  const shared = createSharedDependencies();

  return {
    shared,
    features: {
      pongGame: createPongGameModule(shared),
      settings: createSettingsModule(shared),
      shell: createShellModule(shared)
    }
  };
};
