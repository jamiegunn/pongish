import type {
  BallRampState,
  MortalityState,
  ManualPowerupType,
  PaddleDirection,
  PongGameConfig,
  PongGameState,
  PowerupState,
  Side,
  TimedPowerupEffect
} from "@/features/pong-game/domain";
import {
  activatePendingPowerup,
  activateMortality,
  createDefaultPongGameConfig,
  createInitialPongGameState,
  pauseMatch,
  resetMatch,
  resumeMatch,
  startMatch,
  stepMatch
} from "@/features/pong-game/domain";

export type PauseReason = "manual" | "window_blur";

export type GameSessionCommand =
  | { readonly type: "start" }
  | { readonly type: "reset" }
  | { readonly type: "pause"; readonly reason: PauseReason }
  | { readonly type: "resume" }
  | { readonly type: "tick"; readonly deltaMs: number }
  | { readonly type: "set_player_direction"; readonly direction: PaddleDirection }
  | { readonly type: "activate_powerup"; readonly side: Side }
  | { readonly type: "activate_mortality" };

export interface GameSessionSnapshot {
  readonly state: PongGameState;
  readonly config: PongGameConfig;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const isSide = (value: unknown): value is Side => {
  return value === "left" || value === "right";
};

const isManualPowerup = (value: unknown): value is ManualPowerupType => {
  return value === "shield" || value === "speed-burst";
};

const isTimedEffectType = (value: unknown): value is TimedPowerupEffect["type"] => {
  return value === "paddle-grow" || value === "slow-opponent" || value === "speed-burst";
};

const isTimedEffect = (value: unknown): value is TimedPowerupEffect => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isTimedEffectType(value.type) &&
    isSide(value.side) &&
    isFiniteNumber(value.remainingMs)
  );
};

const isPowerupState = (value: unknown): value is PowerupState => {
  if (!isRecord(value)) {
    return false;
  }

  const pendingManual = value.pendingManual;
  const shieldCharges = value.shieldCharges;

  if (!isRecord(pendingManual) || !isRecord(shieldCharges)) {
    return false;
  }

  const leftPendingValid =
    pendingManual.left === null || isManualPowerup(pendingManual.left);
  const rightPendingValid =
    pendingManual.right === null || isManualPowerup(pendingManual.right);
  const timedEffectsValid =
    Array.isArray(value.timedEffects) && value.timedEffects.every((effect) => isTimedEffect(effect));

  return (
    isFiniteNumber(value.nextDropInMs) &&
    leftPendingValid &&
    rightPendingValid &&
    timedEffectsValid &&
    isFiniteNumber(shieldCharges.left) &&
    isFiniteNumber(shieldCharges.right) &&
    (value.announcement === null || typeof value.announcement === "string") &&
    isFiniteNumber(value.announcementRemainingMs)
  );
};

const isMortalityState = (value: unknown): value is MortalityState => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.available === "boolean" &&
    (value.activeMode === "none" ||
      value.activeMode === "no-ai-score" ||
      value.activeMode === "unstoppable-shot")
  );
};

const isBallRampState = (value: unknown): value is BallRampState => {
  if (!isRecord(value)) {
    return false;
  }

  return isFiniteNumber(value.nextIncreaseInMs) && isFiniteNumber(value.increasesApplied);
};

export const isGameSessionSnapshot = (value: unknown): value is GameSessionSnapshot => {
  if (!isRecord(value)) {
    return false;
  }

  const config = value.config;
  const state = value.state;

  if (!isRecord(config) || !isRecord(state)) {
    return false;
  }

  return (
    isFiniteNumber(config.width) &&
    isFiniteNumber(config.height) &&
    isFiniteNumber(config.winningScore) &&
    isFiniteNumber(config.paddleSpeed) &&
    isFiniteNumber(config.aiTrackingSpeed) &&
    isFiniteNumber(config.ballSpeed) &&
    typeof config.powerupsEnabled === "boolean" &&
    isRecord(state.score) &&
    isFiniteNumber(state.score.left) &&
    isFiniteNumber(state.score.right) &&
    isPowerupState(state.powerups) &&
    isMortalityState(state.mortality) &&
    isBallRampState(state.ballRamp)
  );
};

const FIXED_STEP_MS = 1000 / 60;

export interface PongGameSessionOptions {
  readonly random01?: () => number;
}

export class PongGameSessionUseCase {
  private config: PongGameConfig;
  private state: PongGameState;
  private playerDirection: PaddleDirection = 0;
  private accumulatedMs = 0;
  private readonly random01: () => number;

  constructor(
    configOverrides?: Partial<PongGameConfig>,
    options?: PongGameSessionOptions
  ) {
    this.config = {
      ...createDefaultPongGameConfig(),
      ...configOverrides
    };
    this.state = createInitialPongGameState(this.config);
    this.random01 = options?.random01 ?? Math.random;
  }

  dispatch(command: GameSessionCommand): GameSessionSnapshot {
    switch (command.type) {
      case "start":
        this.state = startMatch(this.state, this.config);
        break;
      case "reset":
        this.accumulatedMs = 0;
        this.playerDirection = 0;
        this.state = resetMatch(this.config);
        break;
      case "pause":
        this.state = pauseMatch(this.state);
        break;
      case "resume":
        this.state = resumeMatch(this.state);
        break;
      case "set_player_direction":
        this.playerDirection = command.direction;
        break;
      case "activate_powerup":
        this.state = activatePendingPowerup(this.state, command.side);
        break;
      case "activate_mortality":
        this.state = activateMortality(this.state);
        break;
      case "tick":
        this.runFixedStep(command.deltaMs);
        break;
      default: {
        const exhaustiveCheck: never = command;
        return exhaustiveCheck;
      }
    }

    return this.getSnapshot();
  }

  getSnapshot(): GameSessionSnapshot {
    return {
      state: this.state,
      config: this.config
    };
  }

  loadSnapshot(snapshot: GameSessionSnapshot): GameSessionSnapshot {
    this.config = {
      ...snapshot.config
    };

    const fallbackPowerups = createInitialPongGameState(this.config).powerups;
    const fallbackMortality = createInitialPongGameState(this.config).mortality;
    const fallbackBallRamp = createInitialPongGameState(this.config).ballRamp;
    const maybePowerups = isPowerupState(snapshot.state.powerups)
      ? snapshot.state.powerups
      : fallbackPowerups;
    const maybeMortality = isMortalityState(snapshot.state.mortality)
      ? snapshot.state.mortality
      : fallbackMortality;
    const maybeBallRamp = isBallRampState(snapshot.state.ballRamp)
      ? snapshot.state.ballRamp
      : fallbackBallRamp;

    this.state = {
      ...snapshot.state,
      powerups: maybePowerups,
      mortality: maybeMortality,
      ballRamp: maybeBallRamp
    };
    this.playerDirection = 0;
    this.accumulatedMs = 0;
    return this.getSnapshot();
  }

  private runFixedStep(deltaMs: number): void {
    if (this.state.phase !== "running") {
      return;
    }

    const frameDeltaMs = Math.max(0, Math.min(deltaMs, 50));
    this.accumulatedMs += frameDeltaMs;

    while (this.accumulatedMs >= FIXED_STEP_MS) {
      this.state = stepMatch(this.state, this.config, {
        leftPaddleDirection: this.playerDirection,
        deltaMs: FIXED_STEP_MS,
        random01: this.random01()
      });
      this.accumulatedMs -= FIXED_STEP_MS;

      if (this.state.phase === "completed") {
        this.accumulatedMs = 0;
        break;
      }
    }
  }
}
