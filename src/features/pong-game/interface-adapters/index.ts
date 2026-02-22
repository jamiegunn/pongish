import type {
  ManualPowerupType,
  MatchPhase,
  PongGameConfig,
  PongGameState,
  Side
} from "@/features/pong-game/domain";

export interface PongViewModel {
  readonly arena: {
    readonly width: number;
    readonly height: number;
  };
  readonly paddles: {
    readonly left: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };
    readonly right: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };
  };
  readonly ball: {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly vx: number;
    readonly vy: number;
  };
  readonly scoreText: string;
  readonly phase: MatchPhase;
  readonly statusText: string;
  readonly winner: Side | null;
  readonly powerups: {
    readonly announcement: string | null;
    readonly pendingLeft: ManualPowerupType | null;
    readonly pendingRight: ManualPowerupType | null;
    readonly nextDropInMs: number;
    readonly shieldLeft: number;
    readonly shieldRight: number;
    readonly leftSpeedBurstRemainingMs: number;
    readonly rightSpeedBurstRemainingMs: number;
    readonly activeEffects: {
      readonly leftPaddleGrow: boolean;
      readonly rightPaddleGrow: boolean;
      readonly leftSpeedBurst: boolean;
      readonly rightSpeedBurst: boolean;
      readonly leftSlowed: boolean;
      readonly rightSlowed: boolean;
    };
  };
  readonly mortality: {
    readonly available: boolean;
    readonly activeMode: "none" | "no-ai-score" | "unstoppable-shot";
  };
}

const manualPowerupLabel = (manual: ManualPowerupType | null): string => {
  if (!manual) {
    return "";
  }
  return manual === "shield" ? "Shield" : "Speed Burst";
};

const buildStatusText = (
  phase: MatchPhase,
  winner: Side | null,
  state: PongGameState
): string => {
  if (phase === "idle") {
    return "Press Start to begin.";
  }

  if (phase === "paused") {
    return "Paused";
  }

  if (phase === "completed") {
    return winner === "left" ? "You win!" : "AI wins!";
  }

  if (state.powerups.pendingManual.left) {
    return `Manual powerup ready: ${manualPowerupLabel(state.powerups.pendingManual.left)} (press E)`;
  }

  if (state.powerups.announcement) {
    return state.powerups.announcement;
  }

  if (state.mortality.available) {
    return "Mortality ready (press M once per game)";
  }

  return "Match in progress";
};

export const presentPongViewModel = (
  state: PongGameState,
  config: PongGameConfig
): PongViewModel => {
  const hasTimedEffect = (
    side: Side,
    type: "paddle-grow" | "speed-burst" | "slow-opponent"
  ): boolean => {
    return state.powerups.timedEffects.some((effect) => effect.side === side && effect.type === type);
  };

  const getTimedEffectRemainingMs = (
    side: Side,
    type: "paddle-grow" | "speed-burst" | "slow-opponent"
  ): number => {
    const found = state.powerups.timedEffects.find(
      (effect) => effect.side === side && effect.type === type
    );
    return found ? Math.max(0, found.remainingMs) : 0;
  };

  return {
    arena: {
      width: config.width,
      height: config.height
    },
    paddles: {
      left: {
        x: state.paddles.left.x,
        y: state.paddles.left.y,
        width: state.paddles.left.width,
        height: state.paddles.left.height
      },
      right: {
        x: state.paddles.right.x,
        y: state.paddles.right.y,
        width: state.paddles.right.width,
        height: state.paddles.right.height
      }
    },
    ball: {
      x: state.ball.position.x,
      y: state.ball.position.y,
      radius: state.ball.radius,
      vx: state.ball.velocity.x,
      vy: state.ball.velocity.y
    },
    scoreText: `${state.score.left} : ${state.score.right}`,
    phase: state.phase,
    statusText: buildStatusText(state.phase, state.winner, state),
    winner: state.winner,
    powerups: {
      announcement: state.powerups.announcement,
      pendingLeft: state.powerups.pendingManual.left,
      pendingRight: state.powerups.pendingManual.right,
      nextDropInMs: state.powerups.nextDropInMs,
      shieldLeft: state.powerups.shieldCharges.left,
      shieldRight: state.powerups.shieldCharges.right,
      leftSpeedBurstRemainingMs: getTimedEffectRemainingMs("left", "speed-burst"),
      rightSpeedBurstRemainingMs: getTimedEffectRemainingMs("right", "speed-burst"),
      activeEffects: {
        leftPaddleGrow: hasTimedEffect("left", "paddle-grow"),
        rightPaddleGrow: hasTimedEffect("right", "paddle-grow"),
        leftSpeedBurst: hasTimedEffect("left", "speed-burst"),
        rightSpeedBurst: hasTimedEffect("right", "speed-burst"),
        leftSlowed: hasTimedEffect("left", "slow-opponent"),
        rightSlowed: hasTimedEffect("right", "slow-opponent")
      }
    },
    mortality: {
      available: state.mortality.available,
      activeMode: state.mortality.activeMode
    }
  };
};
