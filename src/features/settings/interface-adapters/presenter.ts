import type { GameSettings } from "@/features/settings/domain";

export interface PongSessionConfigOverrides {
  readonly winningScore: number;
  readonly paddleSpeed: number;
  readonly ballSpeed: number;
  readonly aiTrackingSpeed: number;
}

export const toPongSessionConfigOverrides = (
  settings: GameSettings
): PongSessionConfigOverrides => {
  const aiScale = 0.45 + settings.aiDifficulty * 0.08;
  const aiTrackingSpeed = Math.round(settings.ballSpeed * aiScale);

  return {
    winningScore: settings.winningScore,
    paddleSpeed: settings.paddleSpeed,
    ballSpeed: settings.ballSpeed,
    aiTrackingSpeed
  };
};
