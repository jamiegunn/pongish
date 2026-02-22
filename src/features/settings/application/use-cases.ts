import type { GameSettings, SettingsValidationErrors } from "@/features/settings/domain";
import {
  DEFAULT_GAME_SETTINGS,
  mergeSettingsWithDefaults,
  validateGameSettings
} from "@/features/settings/domain";

export interface SettingsRepositoryPort {
  get: () => GameSettings | null;
  set: (settings: GameSettings) => void;
  clear: () => void;
}

export interface SaveSettingsResult {
  readonly ok: boolean;
  readonly settings: GameSettings;
  readonly errors: SettingsValidationErrors;
}

export class SettingsUseCases {
  private readonly repository: SettingsRepositoryPort;

  constructor(repository: SettingsRepositoryPort) {
    this.repository = repository;
  }

  getCurrentSettings(): GameSettings {
    return this.repository.get() ?? DEFAULT_GAME_SETTINGS;
  }

  saveSettings(partialSettings: Partial<GameSettings>): SaveSettingsResult {
    const merged = mergeSettingsWithDefaults({
      ...this.getCurrentSettings(),
      ...partialSettings
    });

    const validation = validateGameSettings(merged);

    if (!validation.isValid) {
      return {
        ok: false,
        settings: merged,
        errors: validation.errors
      };
    }

    this.repository.set(merged);
    return {
      ok: true,
      settings: merged,
      errors: {}
    };
  }

  resetSettings(): GameSettings {
    this.repository.clear();
    this.repository.set(DEFAULT_GAME_SETTINGS);
    return DEFAULT_GAME_SETTINGS;
  }
}
