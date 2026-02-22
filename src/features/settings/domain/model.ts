export interface GameSettings {
  readonly winningScore: number;
  readonly paddleSpeed: number;
  readonly ballSpeed: number;
  readonly aiDifficulty: number;
}

export interface SettingsValidationErrors {
  winningScore?: string;
  paddleSpeed?: string;
  ballSpeed?: string;
  aiDifficulty?: string;
}

export interface SettingsValidationResult {
  readonly isValid: boolean;
  readonly errors: SettingsValidationErrors;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  winningScore: 7,
  paddleSpeed: 520,
  ballSpeed: 440,
  aiDifficulty: 6
};
