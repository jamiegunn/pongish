import { useEffect, useMemo, useRef, useState } from "react";
import type {
  PowerUpAlertMode,
  PowerUpSlotSnapshot,
  PowerUpSlotState
} from "@/features/pong-game/frameworks-drivers/powerup-ui-types";

interface PowerUpSlotHUDProps extends PowerUpSlotSnapshot {
  readonly alertMode: PowerUpAlertMode;
  readonly reduceMotion: boolean;
  readonly onActivate: () => void;
}

const SLOT_STATE_LABELS: Record<PowerUpSlotState, string> = {
  charging: "CHARGING",
  ready: "READY",
  active: "ACTIVE",
  cooldown: "COOLDOWN",
  empty: "EMPTY"
};

const clampProgress = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(value, 1));
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
};

const isMatchingKey = (event: KeyboardEvent, keyBinding: string): boolean => {
  const normalized = keyBinding.trim().toUpperCase();
  if (!normalized) {
    return false;
  }

  if (event.key.toUpperCase() === normalized) {
    return true;
  }

  if (normalized.length === 1 && /^[A-Z0-9]$/.test(normalized)) {
    return event.code === `Key${normalized}` || event.code === `Digit${normalized}`;
  }

  return false;
};

const useReadyEntryBurst = (state: PowerUpSlotState, reduceMotion: boolean): boolean => {
  const previousRef = useRef<PowerUpSlotState>(state);
  const [burstActive, setBurstActive] = useState(false);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = state;

    if (reduceMotion) {
      setBurstActive(false);
      return;
    }

    if (state === "ready" && previous !== "ready") {
      setBurstActive(true);
      const timeout = window.setTimeout(() => {
        setBurstActive(false);
      }, 700);
      return () => {
        window.clearTimeout(timeout);
      };
    }
  }, [reduceMotion, state]);

  return burstActive;
};

export function PowerUpSlotHUD(props: PowerUpSlotHUDProps) {
  const readyEntryBurst = useReadyEntryBurst(props.state, props.reduceMotion);

  const activeProgress = useMemo(() => {
    if (props.activeTotalMs <= 0) {
      return 0;
    }
    return clampProgress(props.activeRemainingMs / props.activeTotalMs);
  }, [props.activeRemainingMs, props.activeTotalMs]);

  const meterProgress = useMemo(() => {
    if (props.state === "charging") {
      return clampProgress(props.chargeProgress);
    }

    if (props.state === "cooldown") {
      return clampProgress(props.cooldownProgress);
    }

    if (props.state === "active") {
      return activeProgress;
    }

    if (props.state === "ready") {
      return 1;
    }

    return 0;
  }, [activeProgress, props.chargeProgress, props.cooldownProgress, props.state]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (props.state !== "ready") {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (!isMatchingKey(event, props.keyBinding)) {
        return;
      }

      event.preventDefault();
      props.onActivate();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [props.keyBinding, props.onActivate, props.state]);

  const rootClasses = [
    "powerup-slot",
    `slot-state-${props.state}`,
    `slot-alert-${props.alertMode}`,
    props.reduceMotion ? "slot-reduce-motion" : "slot-motion-enabled",
    readyEntryBurst ? "slot-ready-entry-burst" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const slotName = props.powerUpName.trim() ? props.powerUpName : "Power-Up";

  return (
    <section aria-live="polite" aria-atomic="true" className={rootClasses}>
      <div aria-hidden className="slot-icon">
        <span className="slot-icon-glyph">&gt;&gt;</span>
      </div>

      <div className="slot-copy">
        <p className="slot-name">{slotName.toUpperCase()}</p>
        <p className="slot-state-text">{SLOT_STATE_LABELS[props.state]}</p>
        <div className="slot-meter" role="presentation">
          <span className="slot-meter-fill" style={{ width: `${Math.round(meterProgress * 100)}%` }} />
        </div>
      </div>

      <button
        className="slot-keycap"
        type="button"
        onClick={props.onActivate}
        disabled={props.state !== "ready"}
        aria-label={`Activate ${slotName} with ${props.keyBinding}`}
      >
        [{props.keyBinding.toUpperCase()}]
      </button>
    </section>
  );
}

export type { PowerUpSlotHUDProps };
