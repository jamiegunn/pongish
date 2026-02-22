import type { ActorRuntime } from "@/shared/actors/runtime";
import type { ClockPort } from "@/shared/clock/clock";
import type { StorageGateway } from "@/shared/storage/storage";
import type { PongGameModule } from "@/features/pong-game/frameworks-drivers/di/createPongGameModule";
import type { SettingsModule } from "@/features/settings/frameworks-drivers/di/createSettingsModule";
import type { ShellModule } from "@/features/shell/frameworks-drivers/di/createShellModule";

export interface SharedDependencies {
  readonly actorRuntime: ActorRuntime;
  readonly clock: ClockPort;
  readonly storage: StorageGateway;
}

export interface FeatureModule {
  readonly name: string;
}

export interface AppModule {
  readonly shared: SharedDependencies;
  readonly features: {
    pongGame: PongGameModule;
    settings: SettingsModule;
    shell: ShellModule;
  };
}
