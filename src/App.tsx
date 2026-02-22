import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createAppModule } from "@/app/frameworks-drivers/di/createAppModule";
import { PongGameScreen } from "@/features/pong-game/frameworks-drivers/components/PongGameScreen";
import { PowerUpSlotHUD } from "@/features/pong-game/frameworks-drivers/components/PowerUpSlotHUD";
import type {
  PowerUpAlertMode,
  PowerUpSlotSnapshot
} from "@/features/pong-game/frameworks-drivers/powerup-ui-types";
import type { PongGameConfig } from "@/features/pong-game/domain";
import type { GameSettings } from "@/features/settings/domain";
import { SettingsPanel } from "@/features/settings/frameworks-drivers/components/SettingsPanel";
import { toPongSessionConfigOverrides } from "@/features/settings/interface-adapters";
import { SHELL_TABS } from "@/features/shell/interface-adapters";

const DEFAULT_POWERUP_SLOT: PowerUpSlotSnapshot = {
  state: "empty",
  powerUpName: "No Power-Up",
  keyBinding: "E",
  chargeProgress: 0,
  cooldownProgress: 0,
  activeRemainingMs: 0,
  activeTotalMs: 6_000
};

const ALERT_MODE_ORDER: readonly PowerUpAlertMode[] = ["full", "subtle", "off"];
const ALERT_MODE_STORAGE_KEY = "re-pong.powerup-alert-mode";
const REDUCE_MOTION_OVERRIDE_KEY = "re-pong.reduce-motion-override";

const toNextAlertMode = (current: PowerUpAlertMode): PowerUpAlertMode => {
  const index = ALERT_MODE_ORDER.indexOf(current);
  return ALERT_MODE_ORDER[(index + 1) % ALERT_MODE_ORDER.length];
};

const isPowerUpAlertMode = (value: string | null): value is PowerUpAlertMode => {
  return value === "full" || value === "subtle" || value === "off";
};

const parseReduceMotionOverride = (value: string | null): boolean | null => {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
};

const usePrefersReducedMotion = (): boolean => {
  const getInitialValue = (): boolean => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialValue);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (): void => {
      setPrefersReducedMotion(query.matches);
    };

    onChange();
    query.addEventListener("change", onChange);

    return () => {
      query.removeEventListener("change", onChange);
    };
  }, []);

  return prefersReducedMotion;
};

export function App() {
  const app = useMemo(() => createAppModule(), []);
  const shellController = useMemo(
    () => app.features.shell.createNavigationController("play"),
    [app]
  );

  const [currentView, setCurrentView] = useState(shellController.getView());
  const [hasEnteredArena, setHasEnteredArena] = useState(false);
  const [sessionSeed, setSessionSeed] = useState(0);
  const [sessionConfigOverrides, setSessionConfigOverrides] = useState<Partial<PongGameConfig>>({});
  const [topbarScoreText, setTopbarScoreText] = useState("0 : 0");
  const [powerUpSlot, setPowerUpSlot] = useState<PowerUpSlotSnapshot>(DEFAULT_POWERUP_SLOT);
  const [activationRequestToken, setActivationRequestToken] = useState(0);

  const prefersReducedMotion = usePrefersReducedMotion();
  const [powerUpAlertMode, setPowerUpAlertMode] = useState<PowerUpAlertMode>(() => {
    if (typeof window === "undefined") {
      return "full";
    }

    const stored = window.localStorage.getItem(ALERT_MODE_STORAGE_KEY);
    return isPowerUpAlertMode(stored) ? stored : "full";
  });
  const [reduceMotionOverride, setReduceMotionOverride] = useState<boolean | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return parseReduceMotionOverride(window.localStorage.getItem(REDUCE_MOTION_OVERRIDE_KEY));
  });

  const reduceMotion = reduceMotionOverride ?? prefersReducedMotion;
  const showTopBar = !(currentView === "play" && !hasEnteredArena);

  useEffect(() => {
    const unsubscribe = shellController.subscribe((view) => {
      setCurrentView(view);
    });

    return () => {
      unsubscribe();
    };
  }, [shellController]);

  useEffect(() => {
    const settings = app.features.settings.getCurrentSettings();
    setSessionConfigOverrides(toPongSessionConfigOverrides(settings));
  }, [app]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ALERT_MODE_STORAGE_KEY, powerUpAlertMode);
  }, [powerUpAlertMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (reduceMotionOverride === null) {
      window.localStorage.removeItem(REDUCE_MOTION_OVERRIDE_KEY);
      return;
    }

    window.localStorage.setItem(REDUCE_MOTION_OVERRIDE_KEY, String(reduceMotionOverride));
  }, [reduceMotionOverride]);

  useEffect(() => {
    if (currentView !== "play" || !hasEnteredArena) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.code === "KeyA") {
        event.preventDefault();
        setPowerUpAlertMode((current) => toNextAlertMode(current));
      }

      if (event.code === "KeyR") {
        event.preventDefault();
        setReduceMotionOverride((current) => {
          if (current === null) {
            return !prefersReducedMotion;
          }
          return !current;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentView, hasEnteredArena, prefersReducedMotion]);

  const applySettings = (settings: GameSettings): void => {
    setSessionConfigOverrides(toPongSessionConfigOverrides(settings));
    setSessionSeed((prev) => prev + 1);
    shellController.goTo("play");
  };

  const enterArena = (): void => {
    setHasEnteredArena(true);
    setTopbarScoreText("0 : 0");
    setPowerUpSlot({
      ...DEFAULT_POWERUP_SLOT,
      state: "charging",
      powerUpName: "Power-Up"
    });
    setSessionSeed((prev) => prev + 1);
  };

  const focusTabById = (id: "play" | "settings"): void => {
    const button = document.getElementById(`shell-tab-${id}`);
    button?.focus();
  };

  const handleTabKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    tabId: "play" | "settings"
  ): void => {
    const tabIds = SHELL_TABS.map((tab) => tab.id);
    const currentIndex = tabIds.indexOf(tabId);

    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextId = tabIds[(currentIndex + 1) % tabIds.length];
      shellController.goTo(nextId);
      focusTabById(nextId);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const nextId = tabIds[(currentIndex - 1 + tabIds.length) % tabIds.length];
      shellController.goTo(nextId);
      focusTabById(nextId);
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstId = tabIds[0];
      shellController.goTo(firstId);
      focusTabById(firstId);
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastId = tabIds[tabIds.length - 1];
      shellController.goTo(lastId);
      focusTabById(lastId);
    }
  };

  return (
    <main className="app-shell">
      <section className={`shell-layout${showTopBar ? "" : " shell-layout-no-topbar"}`}>
        {showTopBar ? (
          <header className="shell-topbar">
          <div className="tabs" role="tablist" aria-label="Game navigation">
            {SHELL_TABS.map((tab) => {
              const isActive = currentView === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`shell-tab-${tab.id}`}
                  className={`tab ${isActive ? "tab-active" : ""}`}
                  type="button"
                  role="tab"
                  aria-controls={`shell-panel-${tab.id}`}
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(event) => {
                    handleTabKeyDown(event, tab.id);
                  }}
                  onClick={() => {
                    shellController.goTo(tab.id);
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="topbar-status-zone">
            <p aria-live="polite" className="topbar-score">
              {topbarScoreText}
            </p>
            <div className="topbar-powerup-zone">
              <PowerUpSlotHUD
                state={powerUpSlot.state}
                powerUpName={powerUpSlot.powerUpName}
                keyBinding={powerUpSlot.keyBinding}
                chargeProgress={powerUpSlot.chargeProgress}
                cooldownProgress={powerUpSlot.cooldownProgress}
                activeRemainingMs={powerUpSlot.activeRemainingMs}
                activeTotalMs={powerUpSlot.activeTotalMs}
                alertMode={powerUpAlertMode}
                reduceMotion={reduceMotion}
                onActivate={() => {
                  setActivationRequestToken((current) => current + 1);
                }}
              />
            </div>
          </div>
          </header>
        ) : null}

        {currentView === "play" ? (
          <section
            aria-label={showTopBar ? undefined : "Play"}
            aria-labelledby={showTopBar ? "shell-tab-play" : undefined}
            id="shell-panel-play"
            role="tabpanel"
            tabIndex={0}
          >
            {!hasEnteredArena ? (
              <section className="welcome-panel">
                <p className="eyebrow">Welcome to Pong'ish</p>
                <h1>Enter The Cabinet</h1>
                <p className="welcome-copy">
                  Powerups now spawn during every match. Some trigger instantly, and some are
                  manual: when you get one, press <strong>E</strong> to activate.
                </p>
                <div className="welcome-actions">
                  <button className="button" type="button" onClick={enterArena}>
                    Enter Arena
                  </button>
                </div>
              </section>
            ) : (
              <PongGameScreen
                key={`pong-session-${sessionSeed}`}
                pongModule={app.features.pongGame}
                sessionConfigOverrides={sessionConfigOverrides}
                onScoreChange={setTopbarScoreText}
                onPowerUpSlotChange={setPowerUpSlot}
                powerUpAlertMode={powerUpAlertMode}
                reduceMotion={reduceMotion}
                activationRequestToken={activationRequestToken}
              />
            )}
          </section>
        ) : null}

        {currentView === "settings" ? (
          <section
            aria-labelledby="shell-tab-settings"
            id="shell-panel-settings"
            role="tabpanel"
            tabIndex={0}
          >
            <SettingsPanel module={app.features.settings} onApply={applySettings} />
          </section>
        ) : null}
      </section>
    </main>
  );
}
