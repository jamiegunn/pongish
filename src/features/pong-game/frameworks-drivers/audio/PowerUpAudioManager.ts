import type { PowerUpAlertMode } from "@/features/pong-game/frameworks-drivers/powerup-ui-types";

interface AudioPlayOptions {
  readonly alertMode: PowerUpAlertMode;
  readonly enabled: boolean;
}

export interface PowerUpAudioManager {
  readonly unlock: () => void;
  readonly playReady: (options: AudioPlayOptions) => void;
  readonly playActivate: (options: AudioPlayOptions) => void;
  readonly startReadyLoop: (options: AudioPlayOptions) => void;
  readonly stopReadyLoop: () => void;
  readonly dispose: () => void;
}

const resolveAudioContextCtor = (): (new () => AudioContext) | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const withWebkit = window as Window & {
    webkitAudioContext?: new () => AudioContext;
  };

  return window.AudioContext ?? withWebkit.webkitAudioContext ?? null;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

const canPlayReady = (options: AudioPlayOptions): boolean => {
  return options.enabled && options.alertMode === "full";
};

const canPlayActivate = (options: AudioPlayOptions): boolean => {
  return options.enabled && options.alertMode !== "off";
};

export const createPowerUpAudioManager = (): PowerUpAudioManager => {
  let context: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let unlocked = false;
  let queuedSound: "ready" | "activate" | null = null;
  let queuedSoundOptions: AudioPlayOptions | null = null;
  let readyLoopRequested = false;
  let readyLoopOscillator: OscillatorNode | null = null;
  let readyLoopGain: GainNode | null = null;

  const ensureContext = (): AudioContext | null => {
    const AudioContextCtor = resolveAudioContextCtor();
    if (!AudioContextCtor) {
      return null;
    }

    const activeContext =
      context && context.state !== "closed" ? context : new AudioContextCtor();
    context = activeContext;

    if (!masterGain || masterGain.context !== activeContext) {
      const nextMasterGain = activeContext.createGain();
      nextMasterGain.gain.value = 0.24;
      nextMasterGain.connect(activeContext.destination);
      masterGain = nextMasterGain;
    }

    return activeContext;
  };

  const playTone = (
    frequency: number,
    durationMs: number,
    options?: {
      readonly type?: OscillatorType;
      readonly volume?: number;
      readonly delayMs?: number;
      readonly glideToFrequency?: number | null;
    }
  ): void => {
    const activeContext = ensureContext();
    if (!activeContext || !masterGain) {
      return;
    }

    const oscillator = activeContext.createOscillator();
    const gainNode = activeContext.createGain();

    oscillator.type = options?.type ?? "triangle";
    oscillator.frequency.value = frequency;

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);

    const now = activeContext.currentTime;
    const start = now + (options?.delayMs ?? 0) / 1000;
    const end = start + durationMs / 1000;
    const volume = clamp(options?.volume ?? 0.05, 0.0001, 1);

    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

    if (options?.glideToFrequency && Number.isFinite(options.glideToFrequency)) {
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(
        clamp(options.glideToFrequency, 10, 12_000),
        end
      );
    }

    oscillator.start(start);
    oscillator.stop(end + 0.01);
  };

  const playReadyUnlocked = (): void => {
    playTone(660, 130, {
      type: "triangle",
      volume: 0.046,
      delayMs: 0
    });
    playTone(850, 120, {
      type: "square",
      volume: 0.042,
      delayMs: 122
    });
    playTone(1_080, 150, {
      type: "triangle",
      volume: 0.04,
      delayMs: 236
    });
  };

  const playActivateUnlocked = (): void => {
    playTone(1_120, 120, {
      type: "sawtooth",
      volume: 0.05,
      glideToFrequency: 420
    });
    playTone(540, 90, {
      type: "triangle",
      volume: 0.03,
      delayMs: 28,
      glideToFrequency: 680
    });
  };

  const stopReadyLoop = (): void => {
    readyLoopRequested = false;

    if (readyLoopGain) {
      const activeContext = ensureContext();
      if (activeContext) {
        const now = activeContext.currentTime;
        readyLoopGain.gain.cancelScheduledValues(now);
        readyLoopGain.gain.setTargetAtTime(0.0001, now, 0.06);
      }
    }

    if (readyLoopOscillator) {
      try {
        readyLoopOscillator.stop();
      } catch {
        // Oscillator may already be stopped.
      }
    }

    readyLoopOscillator = null;
    readyLoopGain = null;
  };

  const startReadyLoopUnlocked = (): void => {
    const activeContext = ensureContext();
    if (!activeContext || !masterGain || readyLoopOscillator) {
      return;
    }

    const oscillator = activeContext.createOscillator();
    const gainNode = activeContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.value = 92;

    gainNode.gain.value = 0.0001;
    oscillator.connect(gainNode);
    gainNode.connect(masterGain);

    const now = activeContext.currentTime;
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    readyLoopOscillator = oscillator;
    readyLoopGain = gainNode;
  };

  const flushQueue = (): void => {
    if (!unlocked) {
      return;
    }

    if (queuedSound && queuedSoundOptions) {
      if (queuedSound === "ready" && canPlayReady(queuedSoundOptions)) {
        playReadyUnlocked();
      } else if (queuedSound === "activate" && canPlayActivate(queuedSoundOptions)) {
        playActivateUnlocked();
      }
    }

    queuedSound = null;
    queuedSoundOptions = null;

    if (readyLoopRequested) {
      startReadyLoopUnlocked();
    }
  };

  const unlock = (): void => {
    const activeContext = ensureContext();
    if (!activeContext) {
      return;
    }

    if (activeContext.state !== "running") {
      void activeContext.resume();
    }

    unlocked = true;
    flushQueue();
  };

  return {
    unlock,
    playReady: (options) => {
      if (!canPlayReady(options)) {
        return;
      }

      if (!unlocked) {
        queuedSound = "ready";
        queuedSoundOptions = options;
        return;
      }

      playReadyUnlocked();
    },
    playActivate: (options) => {
      if (!canPlayActivate(options)) {
        return;
      }

      if (!unlocked) {
        queuedSound = "activate";
        queuedSoundOptions = options;
        return;
      }

      playActivateUnlocked();
    },
    startReadyLoop: (options) => {
      if (!canPlayReady(options)) {
        stopReadyLoop();
        return;
      }

      readyLoopRequested = true;

      if (!unlocked) {
        return;
      }

      startReadyLoopUnlocked();
    },
    stopReadyLoop,
    dispose: () => {
      stopReadyLoop();
      queuedSound = null;
      queuedSoundOptions = null;
      unlocked = false;

      if (context) {
        void context.close();
      }

      context = null;
      masterGain = null;
    }
  };
};
