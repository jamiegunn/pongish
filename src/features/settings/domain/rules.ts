import type {
  GameSettings,
  SettingsValidationErrors,
  SettingsValidationResult
} from "@/features/settings/domain/model";
import { DEFAULT_GAME_SETTINGS } from "@/features/settings/domain/model";

const isFiniteInteger = (value: number): boolean => {
  return Number.isInteger(value) && Number.isFinite(value);
};

export const mergeSettingsWithDefaults = (
  partialSettings?: Partial<GameSettings>
): GameSettings => {
  return {
    ...DEFAULT_GAME_SETTINGS,
    ...partialSettings
  };
};

export const validateGameSettings = (
  settings: GameSettings
): SettingsValidationResult => {
  const errors: SettingsValidationErrors = {};

  if (!isFiniteInteger(settings.winningScore) || settings.winningScore < 1 || settings.winningScore > 21) {
    errors.winningScore = "Winning score must be an integer between 1 and 21.";
  }

  if (!isFiniteInteger(settings.paddleSpeed) || settings.paddleSpeed < 250 || settings.paddleSpeed > 900) {
    errors.paddleSpeed = "Paddle speed must be an integer between 250 and 900.";
  }

  if (!isFiniteInteger(settings.ballSpeed) || settings.ballSpeed < 200 || settings.ballSpeed > 900) {
    errors.ballSpeed = "Ball speed must be an integer between 200 and 900.";
  }

  if (!isFiniteInteger(settings.aiDifficulty) || settings.aiDifficulty < 1 || settings.aiDifficulty > 10) {
    errors.aiDifficulty = "AI difficulty must be an integer between 1 and 10.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
