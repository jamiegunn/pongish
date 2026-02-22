import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ManualPowerupType, PaddleDirection, PongGameConfig } from "@/features/pong-game/domain";
import { createPowerUpAudioManager } from "@/features/pong-game/frameworks-drivers/audio/PowerUpAudioManager";
import { PongCanvas } from "@/features/pong-game/frameworks-drivers/components/PongCanvas";
import type { PongGameModule } from "@/features/pong-game/frameworks-drivers/di/createPongGameModule";
import type {
  PowerUpAlertMode,
  PowerUpSlotSnapshot,
  PowerUpSlotState
} from "@/features/pong-game/frameworks-drivers/powerup-ui-types";
import type { PongViewModel } from "@/features/pong-game/interface-adapters";

interface PongGameScreenProps {
  readonly pongModule: PongGameModule;
  readonly sessionConfigOverrides?: Partial<PongGameConfig>;
  readonly onScoreChange?: (scoreText: string) => void;
  readonly onPowerUpSlotChange?: (snapshot: PowerUpSlotSnapshot) => void;
  readonly powerUpAlertMode: PowerUpAlertMode;
  readonly reduceMotion: boolean;
  readonly activationRequestToken: number;
}

type StartSequenceState = "ready" | "countdown" | "started";
type AudioMode = "all" | "music-only" | "sfx-only" | "muted";
type AudioChannel = "music" | "sfx";

interface BallAudioSnapshot {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly phase: PongViewModel["phase"];
}

const POWERUP_DROP_MAX_MS = 13_500;
const POWERUP_ACTIVE_TOTAL_MS = 6_000;
const DEFAULT_SLOT_SNAPSHOT: PowerUpSlotSnapshot = {
  state: "empty",
  powerUpName: "Power-Up",
  keyBinding: "E",
  chargeProgress: 0,
  cooldownProgress: 0,
  activeRemainingMs: 0,
  activeTotalMs: POWERUP_ACTIVE_TOTAL_MS
};

const MUSIC_BASS_PATTERN: readonly (number | null)[] = [38, 38, 45, 45, 41, 41, 36, 36];
const MUSIC_LEAD_PATTERN: readonly (number | null)[] = [
  62,
  65,
  69,
  72,
  74,
  72,
  69,
  65,
  64,
  67,
  71,
  74,
  76,
  74,
  71,
  67
];
const MUSIC_HARMONY_PATTERN: readonly (number | null)[] = [
  57,
  60,
  64,
  67,
  69,
  67,
  64,
  60,
  59,
  62,
  66,
  69,
  71,
  69,
  66,
  62
];
const MUSIC_CHORD_ROOTS: readonly number[] = [38, 45, 41, 36];

const clampNumber = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

const toDirection = (pressedKeys: Set<string>): PaddleDirection => {
  const up = pressedKeys.has("ArrowUp") || pressedKeys.has("KeyW");
  const down = pressedKeys.has("ArrowDown");

  if (up && !down) {
    return -1;
  }

  if (down && !up) {
    return 1;
  }

  return 0;
};

const resolveAudioContextCtor = (): (new () => AudioContext) | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const withWebkit = window as Window & {
    webkitAudioContext?: new () => AudioContext;
  };

  return window.AudioContext ?? withWebkit.webkitAudioContext ?? null;
};

const midiToFrequency = (midi: number): number => {
  return 440 * Math.pow(2, (midi - 69) / 12);
};

const toAudioModeLabel = (mode: AudioMode): string => {
  if (mode === "music-only") {
    return "Music Only";
  }

  if (mode === "sfx-only") {
    return "SFX Only";
  }

  if (mode === "muted") {
    return "Muted";
  }

  return "Music + SFX";
};

const nextAudioMode = (current: AudioMode): AudioMode => {
  if (current === "all") {
    return "music-only";
  }

  if (current === "music-only") {
    return "sfx-only";
  }

  if (current === "sfx-only") {
    return "muted";
  }

  return "all";
};

const parseScoreText = (scoreText: string): { readonly left: number; readonly right: number } => {
  const parts = scoreText.split(":").map((part) => Number.parseInt(part.trim(), 10));
  return {
    left: Number.isFinite(parts[0]) ? parts[0] : 0,
    right: Number.isFinite(parts[1]) ? parts[1] : 0
  };
};

const manualPowerupName = (powerup: ManualPowerupType | null): string => {
  if (powerup === "shield") {
    return "Shield";
  }

  if (powerup === "speed-burst") {
    return "Speed Burst";
  }

  return "Power-Up";
};

export function PongGameScreen(props: PongGameScreenProps) {
  const session = useMemo(
    () => props.pongModule.createSession(props.sessionConfigOverrides),
    [props.pongModule, props.sessionConfigOverrides]
  );
  const powerUpAudioManager = useMemo(() => createPowerUpAudioManager(), []);

  const [viewModel, setViewModel] = useState<PongViewModel>(() => session.getViewModel());
  const [startSequence, setStartSequence] = useState<StartSequenceState>("ready");
  const [countdownSeconds, setCountdownSeconds] = useState(3);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [audioMode, setAudioMode] = useState<AudioMode>("all");
  const [slotSnapshot, setSlotSnapshot] = useState<PowerUpSlotSnapshot>(DEFAULT_SLOT_SNAPSHOT);

  const phaseRef = useRef(viewModel.phase);
  const previousScoreRef = useRef(parseScoreText(viewModel.scoreText));
  const hasSeenManualPowerupRef = useRef(false);
  const lastKnownManualTypeRef = useRef<ManualPowerupType | null>(null);
  const previousSlotStateRef = useRef<PowerUpSlotState>(DEFAULT_SLOT_SNAPSHOT.state);
  const handledActivationRequestRef = useRef(props.activationRequestToken);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const musicTimeoutRef = useRef<number | null>(null);
  const musicStepRef = useRef(0);
  const musicRunningRef = useRef(false);
  const ballSpeedRef = useRef(0);
  const previousBallRef = useRef<BallAudioSnapshot | null>(null);
  const lastBlipMsRef = useRef(0);

  const ensureAudioContext = useCallback((): AudioContext | null => {
    const AudioContextCtor = resolveAudioContextCtor();
    if (!AudioContextCtor) {
      return null;
    }

    const existing = audioContextRef.current;
    const context = existing && existing.state !== "closed" ? existing : new AudioContextCtor();
    audioContextRef.current = context;

    if (!masterGainRef.current || masterGainRef.current.context !== context) {
      const masterGain = context.createGain();
      masterGain.gain.value = 0.34;
      masterGain.connect(context.destination);
      masterGainRef.current = masterGain;
    }

    return context;
  }, []);

  const unlockAudio = useCallback((): void => {
    const context = ensureAudioContext();
    if (!context) {
      return;
    }

    if (context.state !== "running") {
      void context.resume();
    }
  }, [ensureAudioContext]);

  const playTone = useCallback(
    (
      frequency: number,
      durationSec: number,
      options?: {
        readonly channel?: AudioChannel;
        readonly type?: OscillatorType;
        readonly volume?: number;
      }
    ): void => {
      const channel = options?.channel ?? "sfx";
      const shouldPlayChannel =
        audioMode === "all" ||
        (audioMode === "music-only" && channel === "music") ||
        (audioMode === "sfx-only" && channel === "sfx");

      if (!shouldPlayChannel) {
        return;
      }

      try {
        unlockAudio();
        const context = ensureAudioContext();
        if (!context) {
          return;
        }

        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        const volume = options?.volume ?? 0.04;

        oscillator.type = options?.type ?? "square";
        oscillator.frequency.value = frequency;

        oscillator.connect(gainNode);
        gainNode.connect(masterGainRef.current ?? context.destination);

        const now = context.currentTime;
        gainNode.gain.value = 0.0001;
        gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.012);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
        oscillator.start(now);
        oscillator.stop(now + durationSec);
      } catch {
        // Audio is best-effort.
      }
    },
    [audioMode, ensureAudioContext, unlockAudio]
  );

  const playScoreSfx = useCallback(
    (userScored: boolean): void => {
      if (userScored) {
        playTone(700, 0.08, { channel: "sfx", type: "triangle", volume: 0.055 });
        window.setTimeout(() => {
          playTone(880, 0.08, { channel: "sfx", type: "square", volume: 0.052 });
        }, 70);
        window.setTimeout(() => {
          playTone(1_060, 0.1, { channel: "sfx", type: "triangle", volume: 0.046 });
        }, 140);
        return;
      }

      playTone(260, 0.12, { channel: "sfx", type: "sawtooth", volume: 0.055 });
      window.setTimeout(() => {
        playTone(180, 0.15, { channel: "sfx", type: "triangle", volume: 0.05 });
      }, 120);
    },
    [playTone]
  );

  const scheduleMusicStep = useCallback(() => {
    if (!musicRunningRef.current) {
      return;
    }

    const step = musicStepRef.current;
    const bassMidi = MUSIC_BASS_PATTERN[step % MUSIC_BASS_PATTERN.length];
    const leadMidi = MUSIC_LEAD_PATTERN[step % MUSIC_LEAD_PATTERN.length];
    const harmonyMidi = MUSIC_HARMONY_PATTERN[step % MUSIC_HARMONY_PATTERN.length];

    if (bassMidi !== null) {
      playTone(midiToFrequency(bassMidi), 0.14, {
        channel: "music",
        type: "triangle",
        volume: 0.038
      });
    }

    if (leadMidi !== null) {
      playTone(midiToFrequency(leadMidi), 0.1, {
        channel: "music",
        type: "square",
        volume: 0.028
      });
    }

    if (harmonyMidi !== null) {
      playTone(midiToFrequency(harmonyMidi), 0.12, {
        channel: "music",
        type: "sine",
        volume: 0.022
      });
    }

    if (step % 4 === 0) {
      const chordRoot = MUSIC_CHORD_ROOTS[(step / 4) % MUSIC_CHORD_ROOTS.length];
      playTone(midiToFrequency(chordRoot + 12), 0.18, {
        channel: "music",
        type: "triangle",
        volume: 0.018
      });
      playTone(midiToFrequency(chordRoot + 19), 0.18, {
        channel: "music",
        type: "triangle",
        volume: 0.014
      });
    }

    musicStepRef.current += 1;

    const normalizedSpeed = clampNumber(ballSpeedRef.current / 980, 0, 1);
    const nextStepMs = Math.round(260 - normalizedSpeed * 145);

    musicTimeoutRef.current = window.setTimeout(scheduleMusicStep, nextStepMs);
  }, [playTone]);

  const startBackgroundMusic = useCallback((): void => {
    unlockAudio();
    if (musicRunningRef.current) {
      return;
    }

    musicRunningRef.current = true;
    scheduleMusicStep();
  }, [scheduleMusicStep, unlockAudio]);

  const stopBackgroundMusic = useCallback((): void => {
    musicRunningRef.current = false;
    if (musicTimeoutRef.current !== null) {
      window.clearTimeout(musicTimeoutRef.current);
      musicTimeoutRef.current = null;
    }
  }, []);

  const playCountdownBeep = useCallback(
    (frequency: number, durationSec = 0.08) => {
      playTone(frequency, durationSec, {
        channel: "sfx",
        type: "square",
        volume: 0.05
      });
    },
    [playTone]
  );

  const cycleAudioMode = useCallback((): void => {
    setAudioMode((current) => nextAudioMode(current));
  }, []);

  const beginStartCountdown = useCallback(() => {
    if (startSequence === "countdown" || phaseRef.current === "running") {
      return;
    }

    if (phaseRef.current === "completed") {
      session.reset();
    }

    setCountdownSeconds(3);
    setStartSequence("countdown");
  }, [session, startSequence]);

  useEffect(() => {
    phaseRef.current = viewModel.phase;
  }, [viewModel.phase]);

  useEffect(() => {
    const unsubscribe = session.subscribe((nextViewModel) => {
      setViewModel(nextViewModel);
    });

    return () => {
      unsubscribe();
    };
  }, [session]);

  useEffect(() => {
    let rafHandle = 0;
    let previousFrame = performance.now();

    const frame = (now: number): void => {
      const deltaMs = now - previousFrame;
      previousFrame = now;
      session.tick(deltaMs);
      rafHandle = window.requestAnimationFrame(frame);
    };

    rafHandle = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafHandle);
    };
  }, [session]);

  useEffect(() => {
    const bootstrapAudio = (): void => {
      unlockAudio();
      powerUpAudioManager.unlock();
    };

    window.addEventListener("pointerdown", bootstrapAudio);
    window.addEventListener("keydown", bootstrapAudio);

    return () => {
      window.removeEventListener("pointerdown", bootstrapAudio);
      window.removeEventListener("keydown", bootstrapAudio);
    };
  }, [powerUpAudioManager, unlockAudio]);

  useEffect(() => {
    const pressed = new Set<string>();

    const syncDirection = (): void => {
      session.setPlayerDirection(toDirection(pressed));
    };

    const handleBlur = (): void => {
      session.pause("window_blur");
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      unlockAudio();
      powerUpAudioManager.unlock();

      if (event.code === "Space") {
        event.preventDefault();
        if (phaseRef.current === "running") {
          session.pause("manual");
        } else if (phaseRef.current === "paused") {
          session.resume();
          setStartSequence("started");
        } else {
          beginStartCountdown();
        }
        return;
      }

      if (event.code === "Enter") {
        event.preventDefault();
        beginStartCountdown();
        return;
      }

      if (event.code === "KeyM") {
        event.preventDefault();
        session.activateMortality();
        return;
      }

      if (event.code === "KeyH") {
        event.preventDefault();
        setShowHeatmap((previous) => !previous);
        return;
      }

      if (event.code === "KeyS") {
        event.preventDefault();
        cycleAudioMode();
        return;
      }

      if (event.code === "ArrowUp" || event.code === "ArrowDown" || event.code === "KeyW") {
        pressed.add(event.code);
        syncDirection();
      }
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      if (pressed.has(event.code)) {
        pressed.delete(event.code);
        syncDirection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      session.setPlayerDirection(0);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [beginStartCountdown, cycleAudioMode, powerUpAudioManager, session, unlockAudio]);

  useEffect(() => {
    if (startSequence !== "countdown") {
      return;
    }

    if (countdownSeconds <= 0) {
      playCountdownBeep(1_040, 0.14);
      if (phaseRef.current === "paused") {
        session.resume();
      } else {
        session.start();
      }
      setStartSequence("started");
      setCountdownSeconds(3);
      return;
    }

    const tone = 470 + (3 - countdownSeconds) * 140;
    playCountdownBeep(tone, 0.08);
    const timeout = window.setTimeout(() => {
      setCountdownSeconds((prev) => prev - 1);
    }, 1_000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [countdownSeconds, playCountdownBeep, session, startSequence]);

  useEffect(() => {
    if (startSequence === "countdown") {
      return;
    }

    if (viewModel.phase === "running" || viewModel.phase === "paused") {
      setStartSequence("started");
      return;
    }

    if (viewModel.phase === "idle" || viewModel.phase === "completed") {
      setStartSequence("ready");
    }
  }, [startSequence, viewModel.phase]);

  useEffect(() => {
    const shouldPlayMusic =
      startSequence === "started" &&
      (viewModel.phase === "running" || viewModel.phase === "paused") &&
      (audioMode === "all" || audioMode === "music-only");

    if (shouldPlayMusic) {
      startBackgroundMusic();
      return;
    }

    stopBackgroundMusic();
  }, [audioMode, startBackgroundMusic, startSequence, stopBackgroundMusic, viewModel.phase]);

  useEffect(() => {
    const previous = previousScoreRef.current;
    const current = parseScoreText(viewModel.scoreText);
    const scoreChanged = current.left !== previous.left || current.right !== previous.right;

    if (scoreChanged) {
      if (current.left > previous.left) {
        playScoreSfx(true);
      } else if (current.right > previous.right) {
        playScoreSfx(false);
      }

      if (viewModel.phase === "paused") {
        setCountdownSeconds(3);
        setStartSequence("countdown");
      }
    }

    previousScoreRef.current = current;
  }, [playScoreSfx, viewModel.phase, viewModel.scoreText]);

  useEffect(() => {
    const speed = Math.sqrt(
      viewModel.ball.vx * viewModel.ball.vx + viewModel.ball.vy * viewModel.ball.vy
    );
    ballSpeedRef.current = speed;

    const previous = previousBallRef.current;
    const current: BallAudioSnapshot = {
      x: viewModel.ball.x,
      y: viewModel.ball.y,
      vx: viewModel.ball.vx,
      vy: viewModel.ball.vy,
      phase: viewModel.phase
    };

    if (previous && previous.phase === "running" && current.phase === "running") {
      const now = performance.now();
      if (now - lastBlipMsRef.current < 34) {
        previousBallRef.current = current;
        return;
      }

      const flippedY = Math.sign(previous.vy) !== Math.sign(current.vy);
      const isNearWall =
        current.y - viewModel.ball.radius <= 12 ||
        current.y + viewModel.ball.radius >= viewModel.arena.height - 12;

      const flippedX = Math.sign(previous.vx) !== Math.sign(current.vx);
      const isNearLeftPaddle = current.x <= viewModel.arena.width * 0.33;
      const isNearRightPaddle = current.x >= viewModel.arena.width * 0.67;
      const isPaddleCollision = flippedX && (isNearLeftPaddle || isNearRightPaddle);

      if (flippedY && isNearWall) {
        playTone(740, 0.04, {
          channel: "sfx",
          type: "triangle",
          volume: 0.018
        });
        lastBlipMsRef.current = now;
      } else if (isPaddleCollision) {
        playTone(530, 0.05, {
          channel: "sfx",
          type: "square",
          volume: 0.02
        });
        lastBlipMsRef.current = now;
      }
    }

    previousBallRef.current = current;
  }, [
    playTone,
    viewModel.arena.height,
    viewModel.arena.width,
    viewModel.ball.radius,
    viewModel.ball.vx,
    viewModel.ball.vy,
    viewModel.ball.x,
    viewModel.ball.y,
    viewModel.phase
  ]);

  useEffect(() => {
    const pendingManual = viewModel.powerups.pendingLeft;
    const activeRemainingMs = viewModel.powerups.leftSpeedBurstRemainingMs;
    const hasShield = viewModel.powerups.shieldLeft > 0;

    if (pendingManual) {
      lastKnownManualTypeRef.current = pendingManual;
      hasSeenManualPowerupRef.current = true;
    }

    if (activeRemainingMs > 0) {
      lastKnownManualTypeRef.current = "speed-burst";
      hasSeenManualPowerupRef.current = true;
    }

    if (hasShield) {
      lastKnownManualTypeRef.current = "shield";
      hasSeenManualPowerupRef.current = true;
    }

    const sharedProgress = clampNumber(1 - viewModel.powerups.nextDropInMs / POWERUP_DROP_MAX_MS, 0, 1);

    let state: PowerUpSlotState = "charging";
    if (pendingManual) {
      state = "ready";
    } else if (activeRemainingMs > 0) {
      state = "active";
    } else if (hasSeenManualPowerupRef.current) {
      state = "cooldown";
    }

    const fallbackName = manualPowerupName(lastKnownManualTypeRef.current);
    const powerUpName =
      pendingManual !== null
        ? manualPowerupName(pendingManual)
        : activeRemainingMs > 0
          ? "Speed Burst"
          : fallbackName;

    setSlotSnapshot({
      state,
      powerUpName,
      keyBinding: "E",
      chargeProgress: sharedProgress,
      cooldownProgress: sharedProgress,
      activeRemainingMs,
      activeTotalMs: POWERUP_ACTIVE_TOTAL_MS
    });
  }, [
    viewModel.powerups.leftSpeedBurstRemainingMs,
    viewModel.powerups.nextDropInMs,
    viewModel.powerups.pendingLeft,
    viewModel.powerups.shieldLeft
  ]);

  useEffect(() => {
    props.onPowerUpSlotChange?.(slotSnapshot);
  }, [props, slotSnapshot]);

  const sfxEnabled = audioMode === "all" || audioMode === "sfx-only";

  useEffect(() => {
    const previous = previousSlotStateRef.current;
    const current = slotSnapshot.state;
    const audioOptions = {
      alertMode: props.powerUpAlertMode,
      enabled: sfxEnabled
    } as const;

    if (current === "ready") {
      if (previous !== "ready") {
        powerUpAudioManager.playReady(audioOptions);
      }
      powerUpAudioManager.startReadyLoop(audioOptions);
    } else {
      powerUpAudioManager.stopReadyLoop();
    }

    previousSlotStateRef.current = current;
  }, [powerUpAudioManager, props.powerUpAlertMode, sfxEnabled, slotSnapshot.state]);

  useEffect(() => {
    if (props.activationRequestToken === handledActivationRequestRef.current) {
      return;
    }

    handledActivationRequestRef.current = props.activationRequestToken;

    if (slotSnapshot.state !== "ready") {
      return;
    }

    session.activatePowerup("left");
    powerUpAudioManager.playActivate({
      alertMode: props.powerUpAlertMode,
      enabled: sfxEnabled
    });
  }, [
    powerUpAudioManager,
    props.activationRequestToken,
    props.powerUpAlertMode,
    session,
    sfxEnabled,
    slotSnapshot.state
  ]);

  useEffect(() => {
    props.onScoreChange?.(viewModel.scoreText);
  }, [props.onScoreChange, viewModel.scoreText]);

  useEffect(() => {
    return () => {
      stopBackgroundMusic();
      powerUpAudioManager.dispose();
      session.dispose();

      const context = audioContextRef.current;
      if (context) {
        void context.close();
      }

      masterGainRef.current = null;
    };
  }, [powerUpAudioManager, session, stopBackgroundMusic]);

  const showCountdownOverlay = startSequence === "countdown";
  const showReadyOverlay =
    startSequence === "ready" && (viewModel.phase === "idle" || viewModel.phase === "completed");

  return (
    <section className="game-layout">
      <section className="game-main game-main-compact">
        <section className="arena-panel">
          <div className="arena-wrap">
            <PongCanvas
              showHeatmap={showHeatmap}
              viewModel={viewModel}
              playerPowerupState={slotSnapshot.state}
              reduceMotion={props.reduceMotion}
            />

            {showReadyOverlay ? (
              <div className="overlay overlay-ready" role="status">
                <p>Press Start/Select to Start</p>
              </div>
            ) : null}

            {showCountdownOverlay ? (
              <div className="overlay overlay-countdown" role="status">
                <p className="countdown-digit">{countdownSeconds}</p>
              </div>
            ) : null}
          </div>

          <footer className="hint-row">
            <span>Move: W or Arrow Up/Down</span>
            <span>Pause/Start: Space</span>
            <span>Power-Up: E</span>
            <span>Mortality: M</span>
            <span>Heatmap: H</span>
            <span>Audio mode: S ({toAudioModeLabel(audioMode)})</span>
            <span>Alerts: {props.powerUpAlertMode.toUpperCase()} (A)</span>
            <span>Motion: {props.reduceMotion ? "Reduced" : "Full"} (R)</span>
            <span>Auto-pause on blur: On</span>
          </footer>
        </section>
      </section>
    </section>
  );
}
