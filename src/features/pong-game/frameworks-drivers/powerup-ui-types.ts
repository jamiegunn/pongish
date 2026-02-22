export type PowerUpSlotState = "charging" | "ready" | "active" | "cooldown" | "empty";

export type PowerUpAlertMode = "full" | "subtle" | "off";

export interface PowerUpSlotSnapshot {
  readonly state: PowerUpSlotState;
  readonly powerUpName: string;
  readonly keyBinding: string;
  readonly chargeProgress: number;
  readonly cooldownProgress: number;
  readonly activeRemainingMs: number;
  readonly activeTotalMs: number;
}
