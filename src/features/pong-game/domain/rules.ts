import type {
  AutoPowerupType,
  BallState,
  ManualPowerupType,
  MortalityMode,
  PaddleDirection,
  PaddleState,
  PongGameConfig,
  PongGameState,
  PowerupState,
  ScoreState,
  Side,
  StepInput,
  TimedPowerupEffect,
  TimedPowerupType,
  Vector2
} from "@/features/pong-game/domain/model";

const POWERUP_DURATION_MS = 6_000;
const POWERUP_DROP_MIN_MS = 7_500;
const POWERUP_DROP_MAX_MS = 13_500;
const POWERUP_ANNOUNCEMENT_MS = 2_200;
const USER_PADDLE_RAMP_MULTIPLIER = 1.25;
const SPIN_MAX = 2.4;
const SPIN_CURVE_FACTOR = 1.35;
const SPIN_DECAY_BASE = 0.35;
const SPIN_FROM_PADDLE_MOVEMENT = 1.05;
const SPIN_FROM_IMPACT_OFFSET = 0.25;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

const normalizeRandom = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  return clamp(value, 0, 1);
};

const deriveRandom = (base: number, salt: number): number => {
  const value = (normalizeRandom(base) * salt) % 1;
  return value < 0 ? value + 1 : value;
};

const createPaddle = (config: PongGameConfig, side: Side): PaddleState => {
  const y = (config.height - config.paddleHeight) / 2;
  const x =
    side === "left"
      ? config.paddleInset
      : config.width - config.paddleInset - config.paddleWidth;

  return {
    x,
    y,
    width: config.paddleWidth,
    height: config.paddleHeight
  };
};

const createCenteredBall = (
  config: PongGameConfig,
  velocity: Vector2 = { x: 0, y: 0 }
): BallState => {
  return {
    position: {
      x: config.width / 2,
      y: config.height / 2
    },
    velocity,
    spin: 0,
    radius: config.ballRadius
  };
};

const createServeVelocity = (
  config: PongGameConfig,
  directionX: -1 | 1,
  serveCounter: number
): Vector2 => {
  const angleFactor = serveCounter % 2 === 0 ? 0.34 : -0.34;
  return {
    x: directionX * config.ballSpeed,
    y: config.ballSpeed * angleFactor
  };
};

const isBallTouchingPaddle = (ball: BallState, paddle: PaddleState): boolean => {
  const ballLeft = ball.position.x - ball.radius;
  const ballRight = ball.position.x + ball.radius;
  const ballTop = ball.position.y - ball.radius;
  const ballBottom = ball.position.y + ball.radius;

  const paddleLeft = paddle.x;
  const paddleRight = paddle.x + paddle.width;
  const paddleTop = paddle.y;
  const paddleBottom = paddle.y + paddle.height;

  return (
    ballRight >= paddleLeft &&
    ballLeft <= paddleRight &&
    ballBottom >= paddleTop &&
    ballTop <= paddleBottom
  );
};

const getRandomizedDropIntervalMs = (random01: number): number => {
  const factor = normalizeRandom(random01);
  return POWERUP_DROP_MIN_MS + factor * (POWERUP_DROP_MAX_MS - POWERUP_DROP_MIN_MS);
};

const createPowerupState = (): PowerupState => {
  return {
    nextDropInMs: 5_500,
    pendingManual: {
      left: null,
      right: null
    },
    timedEffects: [],
    shieldCharges: {
      left: 0,
      right: 0
    },
    announcement: null,
    announcementRemainingMs: 0
  };
};

const createMortalityState = (): PongGameState["mortality"] => {
  return {
    available: true,
    activeMode: "none"
  };
};

const createBallRampState = (): PongGameState["ballRamp"] => {
  return {
    nextIncreaseInMs: 0,
    increasesApplied: 0
  };
};

const withAnnouncement = (powerups: PowerupState, text: string): PowerupState => {
  return {
    ...powerups,
    announcement: text,
    announcementRemainingMs: POWERUP_ANNOUNCEMENT_MS
  };
};

const upsertTimedEffect = (
  timedEffects: readonly TimedPowerupEffect[],
  nextEffect: TimedPowerupEffect
): readonly TimedPowerupEffect[] => {
  const existingIndex = timedEffects.findIndex(
    (effect) => effect.side === nextEffect.side && effect.type === nextEffect.type
  );

  if (existingIndex === -1) {
    return [...timedEffects, nextEffect];
  }

  return timedEffects.map((effect, index) => {
    if (index !== existingIndex) {
      return effect;
    }

    return {
      ...effect,
      remainingMs: Math.max(effect.remainingMs, nextEffect.remainingMs)
    };
  });
};

const getPaddleScale = (powerups: PowerupState, side: Side): number => {
  const hasGrow = powerups.timedEffects.some(
    (effect) => effect.side === side && effect.type === "paddle-grow"
  );
  return hasGrow ? 1.45 : 1;
};

const getPaddleSpeedMultiplier = (powerups: PowerupState, side: Side): number => {
  let multiplier = 1;

  if (
    powerups.timedEffects.some(
      (effect) => effect.side === side && effect.type === "slow-opponent"
    )
  ) {
    multiplier *= 0.68;
  }

  if (
    powerups.timedEffects.some(
      (effect) => effect.side === side && effect.type === "speed-burst"
    )
  ) {
    multiplier *= 1.55;
  }

  return multiplier;
};

const chooseAutoPowerup = (random01: number): AutoPowerupType => {
  const choices: readonly AutoPowerupType[] = [
    "paddle-grow",
    "slow-opponent",
    "chaos-curve"
  ];
  const index = Math.floor(normalizeRandom(random01) * choices.length) % choices.length;
  return choices[index];
};

const chooseManualPowerup = (random01: number): ManualPowerupType => {
  return normalizeRandom(random01) < 0.52 ? "shield" : "speed-burst";
};

const sideLabel = (side: Side): string => {
  return side === "left" ? "You" : "AI";
};

const applyAutoPowerup = (
  state: PongGameState,
  config: PongGameConfig,
  side: Side,
  autoType: AutoPowerupType,
  random01: number
): PongGameState => {
  if (autoType === "paddle-grow") {
    const timedEffects = upsertTimedEffect(state.powerups.timedEffects, {
      type: "paddle-grow",
      side,
      remainingMs: POWERUP_DURATION_MS
    });

    return {
      ...state,
      powerups: withAnnouncement(
        {
          ...state.powerups,
          timedEffects
        },
        `${sideLabel(side)} received Paddle Grow`
      )
    };
  }

  if (autoType === "slow-opponent") {
    const target = side === "left" ? "right" : "left";
    const timedEffects = upsertTimedEffect(state.powerups.timedEffects, {
      type: "slow-opponent",
      side: target,
      remainingMs: POWERUP_DURATION_MS
    });

    return {
      ...state,
      powerups: withAnnouncement(
        {
          ...state.powerups,
          timedEffects
        },
        `${sideLabel(side)} cast Slow Opponent`
      )
    };
  }

  const curve = (deriveRandom(random01, 2.17) - 0.5) * config.ballSpeed * 1.1;
  const chaosBall: BallState = {
    ...state.ball,
    velocity: {
      x: state.ball.velocity.x * 1.08,
      y: state.ball.velocity.y + curve
    },
    spin: clamp(
      state.ball.spin + (deriveRandom(random01, 11.07) - 0.5) * 0.7,
      -SPIN_MAX,
      SPIN_MAX
    )
  };

  return {
    ...state,
    ball: chaosBall,
    powerups: withAnnouncement(state.powerups, `${sideLabel(side)} triggered Chaos Curve`)
  };
};

const queueManualPowerup = (
  state: PongGameState,
  side: Side,
  manualType: ManualPowerupType
): PongGameState => {
  const pendingManual = {
    ...state.powerups.pendingManual,
    [side]: manualType
  };

  const manualLabel = manualType === "shield" ? "Shield" : "Speed Burst";

  return {
    ...state,
    powerups: withAnnouncement(
      {
        ...state.powerups,
        pendingManual
      },
      `${sideLabel(side)} obtained manual ${manualLabel}`
    )
  };
};

const maybeSpawnPowerup = (
  state: PongGameState,
  config: PongGameConfig,
  deltaMs: number,
  random01: number
): PongGameState => {
  if (!config.powerupsEnabled) {
    return state;
  }

  const nextDropInMs = state.powerups.nextDropInMs - deltaMs;
  let workingState: PongGameState = {
    ...state,
    powerups: {
      ...state.powerups,
      nextDropInMs
    }
  };

  if (nextDropInMs > 0) {
    return workingState;
  }

  const side: Side = normalizeRandom(random01) < 0.5 ? "left" : "right";
  const isManual = deriveRandom(random01, 5.7) >= 0.58;

  if (isManual) {
    const manualType = chooseManualPowerup(deriveRandom(random01, 8.1));
    workingState = queueManualPowerup(workingState, side, manualType);
  } else {
    const autoType = chooseAutoPowerup(deriveRandom(random01, 10.3));
    workingState = applyAutoPowerup(workingState, config, side, autoType, random01);
  }

  return {
    ...workingState,
    powerups: {
      ...workingState.powerups,
      nextDropInMs: getRandomizedDropIntervalMs(deriveRandom(random01, 13.37))
    }
  };
};

const tickPowerupState = (state: PongGameState, deltaMs: number): PongGameState => {
  const timedEffects = state.powerups.timedEffects
    .map((effect) => ({
      ...effect,
      remainingMs: effect.remainingMs - deltaMs
    }))
    .filter((effect) => effect.remainingMs > 0);

  const announcementRemainingMs = Math.max(0, state.powerups.announcementRemainingMs - deltaMs);

  return {
    ...state,
    powerups: {
      ...state.powerups,
      timedEffects,
      announcementRemainingMs,
      announcement: announcementRemainingMs > 0 ? state.powerups.announcement : null
    }
  };
};

const maybeActivateAiManualPowerup = (
  state: PongGameState,
  random01: number
): PongGameState => {
  const pending = state.powerups.pendingManual.right;
  if (!pending) {
    return state;
  }

  if (normalizeRandom(random01) < 0.977) {
    return state;
  }

  return activatePendingPowerup(state, "right");
};

const movePaddle = (
  paddle: PaddleState,
  direction: PaddleDirection,
  speed: number,
  config: PongGameConfig,
  deltaSeconds: number
): PaddleState => {
  if (direction === 0) {
    return paddle;
  }

  const maxY = config.height - paddle.height;
  const nextY = clamp(paddle.y + speed * direction * deltaSeconds, 0, maxY);
  return { ...paddle, y: nextY };
};

const getAiDirection = (paddle: PaddleState, ballY: number): PaddleDirection => {
  const centerY = paddle.y + paddle.height / 2;

  if (Math.abs(ballY - centerY) < 4) {
    return 0;
  }

  return ballY > centerY ? 1 : -1;
};

const withResetBallAfterPoint = (
  state: PongGameState,
  config: PongGameConfig,
  sideScored: Side
): PongGameState => {
  const nextScore: ScoreState = {
    left: state.score.left + (sideScored === "left" ? 1 : 0),
    right: state.score.right + (sideScored === "right" ? 1 : 0)
  };

  const hasWinner =
    nextScore.left >= config.winningScore || nextScore.right >= config.winningScore;

  if (hasWinner) {
    return {
      ...state,
      phase: "completed",
      score: nextScore,
      winner: sideScored,
      lastScoredBy: sideScored,
      ball: createCenteredBall(config),
      powerups: {
        ...state.powerups,
        pendingManual: {
          left: null,
          right: null
        },
        timedEffects: [],
        announcement: `${sideLabel(sideScored)} wins the match`,
        announcementRemainingMs: POWERUP_ANNOUNCEMENT_MS
      },
      mortality: {
        ...state.mortality,
        activeMode: "none"
      },
      ballRamp: createBallRampState()
    };
  }

  const nextServeCounter = state.serveCounter + 1;
  const nextDirection = sideScored === "left" ? 1 : -1;

  return {
    ...state,
    phase: "paused",
    score: nextScore,
    lastScoredBy: sideScored,
    serveCounter: nextServeCounter,
    ball: createCenteredBall(config, createServeVelocity(config, nextDirection, nextServeCounter)),
    powerups: {
      ...state.powerups,
      timedEffects: []
    },
    mortality: {
      ...state.mortality,
      activeMode: "none"
    },
    ballRamp: createBallRampState()
  };
};

const maybeProtectGoalWithShield = (
  state: PongGameState,
  config: PongGameConfig,
  sideConceding: Side
): PongGameState | null => {
  if (state.powerups.shieldCharges[sideConceding] <= 0) {
    return null;
  }

  const shieldCharges = {
    ...state.powerups.shieldCharges,
    [sideConceding]: state.powerups.shieldCharges[sideConceding] - 1
  };

  const bouncedBall: BallState =
    sideConceding === "left"
      ? {
          ...state.ball,
          position: {
            ...state.ball.position,
            x: state.ball.radius + 3
          },
          velocity: {
            ...state.ball.velocity,
            x: Math.abs(state.ball.velocity.x) * 1.04
          }
        }
      : {
          ...state.ball,
          position: {
            ...state.ball.position,
            x: config.width - state.ball.radius - 3
          },
          velocity: {
            ...state.ball.velocity,
            x: -Math.abs(state.ball.velocity.x) * 1.04
          }
        };

  return {
    ...state,
    ball: bouncedBall,
    powerups: withAnnouncement(
      {
        ...state.powerups,
        shieldCharges
      },
      `${sideLabel(sideConceding)} used Shield`
    )
  };
};

export const createInitialPongGameState = (config: PongGameConfig): PongGameState => {
  return {
    phase: "idle",
    score: {
      left: 0,
      right: 0
    },
    paddles: {
      left: createPaddle(config, "left"),
      right: createPaddle(config, "right")
    },
    ball: createCenteredBall(config),
    winner: null,
    lastScoredBy: null,
    serveCounter: 0,
    powerups: createPowerupState(),
    mortality: createMortalityState(),
    ballRamp: createBallRampState()
  };
};

export const startMatch = (
  state: PongGameState,
  config: PongGameConfig
): PongGameState => {
  if (state.phase === "running") {
    return state;
  }

  const serveVelocity = createServeVelocity(config, 1, state.serveCounter);

  return {
    ...state,
    phase: "running",
    winner: null,
    ball: createCenteredBall(config, serveVelocity)
  };
};

export const pauseMatch = (state: PongGameState): PongGameState => {
  if (state.phase !== "running") {
    return state;
  }

  return {
    ...state,
    phase: "paused"
  };
};

export const resumeMatch = (state: PongGameState): PongGameState => {
  if (state.phase !== "paused") {
    return state;
  }

  return {
    ...state,
    phase: "running"
  };
};

export const resetMatch = (config: PongGameConfig): PongGameState => {
  return createInitialPongGameState(config);
};

export const activatePendingPowerup = (
  state: PongGameState,
  side: Side
): PongGameState => {
  const pending = state.powerups.pendingManual[side];

  if (!pending) {
    return state;
  }

  const pendingManual = {
    ...state.powerups.pendingManual,
    [side]: null
  };

  if (pending === "shield") {
    const shieldCharges = {
      ...state.powerups.shieldCharges,
      [side]: state.powerups.shieldCharges[side] + 1
    };

    return {
      ...state,
      powerups: withAnnouncement(
        {
          ...state.powerups,
          pendingManual,
          shieldCharges
        },
        `${sideLabel(side)} armed Shield`
      )
    };
  }

  const timedEffects = upsertTimedEffect(state.powerups.timedEffects, {
    type: "speed-burst",
    side,
    remainingMs: POWERUP_DURATION_MS
  });

  return {
    ...state,
    powerups: withAnnouncement(
      {
        ...state.powerups,
        pendingManual,
        timedEffects
      },
      `${sideLabel(side)} activated Speed Burst`
    )
  };
};

export const activateMortality = (state: PongGameState): PongGameState => {
  if (state.phase !== "running" || !state.mortality.available) {
    return state;
  }

  const aiInControl = state.ball.velocity.x < 0;
  const aboutToHitByPlayer =
    aiInControl &&
    state.ball.position.x <=
      state.paddles.left.x + state.paddles.left.width + state.ball.radius + 32;

  let activeMode: MortalityMode = "unstoppable-shot";
  let announcement = "MORTALITY: your next attack is unstoppable";

  if (aiInControl && !aboutToHitByPlayer) {
    activeMode = "no-ai-score";
    announcement = "MORTALITY: AI cannot score this rally";
  }

  if (aboutToHitByPlayer) {
    activeMode = "unstoppable-shot";
    announcement = "MORTALITY: AI cannot block your return";
  }

  return {
    ...state,
    mortality: {
      available: false,
      activeMode
    },
    powerups: withAnnouncement(state.powerups, announcement)
  };
};

export const stepMatch = (
  state: PongGameState,
  config: PongGameConfig,
  input: StepInput
): PongGameState => {
  if (state.phase !== "running") {
    return state;
  }

  const deltaSeconds = clamp(input.deltaMs / 1000, 0, 0.05);
  const random01 = normalizeRandom(input.random01);

  let workingState = tickPowerupState(state, input.deltaMs);
  workingState = maybeSpawnPowerup(workingState, config, input.deltaMs, random01);
  workingState = maybeActivateAiManualPowerup(workingState, deriveRandom(random01, 3.77));

  const leftScale = getPaddleScale(workingState.powerups, "left");
  const rightScale = getPaddleScale(workingState.powerups, "right");
  const leftSpeedMultiplier = getPaddleSpeedMultiplier(workingState.powerups, "left");
  const rightSpeedMultiplier = getPaddleSpeedMultiplier(workingState.powerups, "right");

  const normalizedLeft = {
    ...workingState.paddles.left,
    width: config.paddleWidth,
    height: Math.round(config.paddleHeight * leftScale)
  };
  const normalizedRight = {
    ...workingState.paddles.right,
    width: config.paddleWidth,
    height: Math.round(config.paddleHeight * rightScale)
  };

  const leftPaddle = movePaddle(
    normalizedLeft,
    input.leftPaddleDirection,
    config.paddleSpeed * leftSpeedMultiplier,
    config,
    deltaSeconds
  );

  const aiDirection = getAiDirection(normalizedRight, workingState.ball.position.y);
  const rightPaddle = movePaddle(
    normalizedRight,
    aiDirection,
    config.aiTrackingSpeed * rightSpeedMultiplier,
    config,
    deltaSeconds
  );

  let nextBall: BallState = {
    ...workingState.ball,
    velocity: {
      x: workingState.ball.velocity.x,
      y:
        workingState.ball.velocity.y +
        workingState.ball.spin * config.ballSpeed * SPIN_CURVE_FACTOR * deltaSeconds
    },
    spin: clamp(
      workingState.ball.spin * Math.pow(SPIN_DECAY_BASE, deltaSeconds),
      -SPIN_MAX,
      SPIN_MAX
    ),
    position: {
      x: workingState.ball.position.x + workingState.ball.velocity.x * deltaSeconds,
      y:
        workingState.ball.position.y +
        (workingState.ball.velocity.y +
          workingState.ball.spin * config.ballSpeed * SPIN_CURVE_FACTOR * deltaSeconds) *
          deltaSeconds
    }
  };

  if (nextBall.position.y - nextBall.radius <= 0) {
    nextBall = {
      ...nextBall,
      position: { ...nextBall.position, y: nextBall.radius },
      velocity: { ...nextBall.velocity, y: Math.abs(nextBall.velocity.y) },
      spin: nextBall.spin * 0.92
    };
  }

  if (nextBall.position.y + nextBall.radius >= config.height) {
    nextBall = {
      ...nextBall,
      position: { ...nextBall.position, y: config.height - nextBall.radius },
      velocity: { ...nextBall.velocity, y: -Math.abs(nextBall.velocity.y) },
      spin: nextBall.spin * 0.92
    };
  }

  if (nextBall.velocity.x < 0 && isBallTouchingPaddle(nextBall, leftPaddle)) {
    const paddleCenterY = leftPaddle.y + leftPaddle.height / 2;
    const normalizedImpact = (nextBall.position.y - paddleCenterY) / (leftPaddle.height / 2);
    const spinFromPaddleMovement =
      input.leftPaddleDirection * config.ballSpeed * 0.32 * leftSpeedMultiplier;
    const nextSpin = clamp(
      nextBall.spin * 0.4 +
        input.leftPaddleDirection * SPIN_FROM_PADDLE_MOVEMENT +
        normalizedImpact * SPIN_FROM_IMPACT_OFFSET,
      -SPIN_MAX,
      SPIN_MAX
    );
    nextBall = {
      ...nextBall,
      position: { ...nextBall.position, x: leftPaddle.x + leftPaddle.width + nextBall.radius },
      velocity: {
        x: Math.abs(nextBall.velocity.x) * 1.02 * USER_PADDLE_RAMP_MULTIPLIER,
        y:
          (nextBall.velocity.y +
            normalizedImpact * config.ballSpeed * 0.55 +
            spinFromPaddleMovement) *
          USER_PADDLE_RAMP_MULTIPLIER
      },
      spin: nextSpin
    };
  }

  if (
    nextBall.velocity.x > 0 &&
    workingState.mortality.activeMode !== "unstoppable-shot" &&
    isBallTouchingPaddle(nextBall, rightPaddle)
  ) {
    const paddleCenterY = rightPaddle.y + rightPaddle.height / 2;
    const normalizedImpact = (nextBall.position.y - paddleCenterY) / (rightPaddle.height / 2);
    const spinFromPaddleMovement = aiDirection * config.ballSpeed * 0.32 * rightSpeedMultiplier;
    const nextSpin = clamp(
      nextBall.spin * 0.4 +
        aiDirection * SPIN_FROM_PADDLE_MOVEMENT +
        normalizedImpact * SPIN_FROM_IMPACT_OFFSET,
      -SPIN_MAX,
      SPIN_MAX
    );
    nextBall = {
      ...nextBall,
      position: { ...nextBall.position, x: rightPaddle.x - nextBall.radius },
      velocity: {
        x: -Math.abs(nextBall.velocity.x) * 1.02,
        y:
          nextBall.velocity.y +
          normalizedImpact * config.ballSpeed * 0.55 +
          spinFromPaddleMovement
      },
      spin: nextSpin
    };
  }

  const maxVelocity = config.ballSpeed * 20;
  nextBall = {
    ...nextBall,
    velocity: {
      x: clamp(nextBall.velocity.x, -maxVelocity, maxVelocity),
      y: clamp(nextBall.velocity.y, -maxVelocity, maxVelocity)
    }
  };

  const baseState: PongGameState = {
    ...workingState,
    paddles: {
      left: leftPaddle,
      right: rightPaddle
    },
    ball: nextBall
  };
  const mortalityMode = baseState.mortality.activeMode;

  if (nextBall.position.x + nextBall.radius < 0) {
    if (mortalityMode === "no-ai-score") {
      return {
        ...baseState,
        ball: {
          ...baseState.ball,
          position: {
            ...baseState.ball.position,
            x: baseState.ball.radius + 3
          },
          velocity: {
            ...baseState.ball.velocity,
            x: Math.abs(baseState.ball.velocity.x) * 1.06
          }
        },
        mortality: {
          ...baseState.mortality,
          activeMode: "none"
        },
        powerups: withAnnouncement(baseState.powerups, "MORTALITY blocked AI score")
      };
    }

    const shielded = maybeProtectGoalWithShield(baseState, config, "left");
    if (shielded) {
      return shielded;
    }

    return withResetBallAfterPoint(baseState, config, "right");
  }

  if (nextBall.position.x - nextBall.radius > config.width) {
    const shielded = maybeProtectGoalWithShield(baseState, config, "right");
    if (shielded) {
      return shielded;
    }

    return withResetBallAfterPoint(baseState, config, "left");
  }

  return baseState;
};
