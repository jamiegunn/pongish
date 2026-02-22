export type Side = "left" | "right";
export type MatchPhase = "idle" | "running" | "paused" | "completed";
export type PaddleDirection = -1 | 0 | 1;
export type ManualPowerupType = "shield" | "speed-burst";
export type AutoPowerupType = "paddle-grow" | "slow-opponent" | "chaos-curve";
export type PowerupType = ManualPowerupType | AutoPowerupType;
export type TimedPowerupType = "paddle-grow" | "slow-opponent" | "speed-burst";
export type MortalityMode = "none" | "no-ai-score" | "unstoppable-shot";

export interface Vector2 {
  readonly x: number;
  readonly y: number;
}

export interface PongGameConfig {
  readonly width: number;
  readonly height: number;
  readonly winningScore: number;
  readonly paddleInset: number;
  readonly paddleWidth: number;
  readonly paddleHeight: number;
  readonly paddleSpeed: number;
  readonly aiTrackingSpeed: number;
  readonly ballRadius: number;
  readonly ballSpeed: number;
  readonly powerupsEnabled: boolean;
}

export interface PaddleState {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BallState {
  readonly position: Vector2;
  readonly velocity: Vector2;
  readonly spin: number;
  readonly radius: number;
}

export interface ScoreState {
  readonly left: number;
  readonly right: number;
}

export interface TimedPowerupEffect {
  readonly type: TimedPowerupType;
  readonly side: Side;
  readonly remainingMs: number;
}

export interface PowerupState {
  readonly nextDropInMs: number;
  readonly pendingManual: Record<Side, ManualPowerupType | null>;
  readonly timedEffects: readonly TimedPowerupEffect[];
  readonly shieldCharges: Record<Side, number>;
  readonly announcement: string | null;
  readonly announcementRemainingMs: number;
}

export interface MortalityState {
  readonly available: boolean;
  readonly activeMode: MortalityMode;
}

export interface BallRampState {
  readonly nextIncreaseInMs: number;
  readonly increasesApplied: number;
}

export interface PongGameState {
  readonly phase: MatchPhase;
  readonly score: ScoreState;
  readonly paddles: Record<Side, PaddleState>;
  readonly ball: BallState;
  readonly winner: Side | null;
  readonly lastScoredBy: Side | null;
  readonly serveCounter: number;
  readonly powerups: PowerupState;
  readonly mortality: MortalityState;
  readonly ballRamp: BallRampState;
}

export interface StepInput {
  readonly leftPaddleDirection: PaddleDirection;
  readonly deltaMs: number;
  readonly random01: number;
}

export const createDefaultPongGameConfig = (): PongGameConfig => {
  return {
    width: 1440,
    height: 675,
    winningScore: 7,
    paddleInset: 36,
    paddleWidth: 14,
    paddleHeight: 96,
    paddleSpeed: 520,
    aiTrackingSpeed: 470,
    ballRadius: 9,
    ballSpeed: 440,
    powerupsEnabled: true
  };
};
