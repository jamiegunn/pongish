import type { FeatureModule, SharedDependencies } from "@/app/frameworks-drivers/di/module-types";
import type { SaveSettingsResult } from "@/features/settings/application";
import { SettingsUseCases } from "@/features/settings/application";
import type { GameSettings } from "@/features/settings/domain";
import { LocalStorageSettingsRepository } from "@/features/settings/frameworks-drivers/local-storage-settings-repository";

export interface SettingsModule extends FeatureModule {
  readonly getCurrentSettings: () => GameSettings;
  readonly saveSettings: (partialSettings: Partial<GameSettings>) => SaveSettingsResult;
  readonly resetSettings: () => GameSettings;
}

export const createSettingsModule = (deps: SharedDependencies): SettingsModule => {
  const repository = new LocalStorageSettingsRepository(deps.storage);
  const useCases = new SettingsUseCases(repository);

  return {
    name: "settings",
    getCurrentSettings: () => useCases.getCurrentSettings(),
    saveSettings: (partialSettings) => useCases.saveSettings(partialSettings),
    resetSettings: () => useCases.resetSettings()
  };
};
