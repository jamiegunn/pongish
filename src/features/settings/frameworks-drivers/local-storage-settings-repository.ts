import type { SettingsRepositoryPort } from "@/features/settings/application";
import type { GameSettings } from "@/features/settings/domain";
import { DEFAULT_GAME_SETTINGS, mergeSettingsWithDefaults } from "@/features/settings/domain";
import type { StorageGateway } from "@/shared/storage/storage";

const SETTINGS_STORAGE_KEY = "pong.settings.v1";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const toNumber = (value: unknown, fallback: number): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const parseSettings = (raw: string): GameSettings | null => {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return null;
    }

    return mergeSettingsWithDefaults({
      winningScore: toNumber(parsed.winningScore, DEFAULT_GAME_SETTINGS.winningScore),
      paddleSpeed: toNumber(parsed.paddleSpeed, DEFAULT_GAME_SETTINGS.paddleSpeed),
      ballSpeed: toNumber(parsed.ballSpeed, DEFAULT_GAME_SETTINGS.ballSpeed),
      aiDifficulty: toNumber(parsed.aiDifficulty, DEFAULT_GAME_SETTINGS.aiDifficulty)
    });
  } catch {
    return null;
  }
};

export class LocalStorageSettingsRepository implements SettingsRepositoryPort {
  private readonly storage: StorageGateway;

  constructor(storage: StorageGateway) {
    this.storage = storage;
  }

  get(): GameSettings | null {
    const raw = this.storage.get(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return parseSettings(raw);
  }

  set(settings: GameSettings): void {
    this.storage.set(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  clear(): void {
    this.storage.remove(SETTINGS_STORAGE_KEY);
  }
}
