import { useEffect, useState } from "react";
import type { GameSettings, SettingsValidationErrors } from "@/features/settings/domain";
import type { SettingsModule } from "@/features/settings/frameworks-drivers/di/createSettingsModule";

interface SettingsPanelProps {
  readonly module: SettingsModule;
  readonly onApply: (settings: GameSettings) => void;
}

type SettingsField = keyof GameSettings;

interface SettingsFormState {
  readonly winningScore: string;
  readonly paddleSpeed: string;
  readonly ballSpeed: string;
  readonly aiDifficulty: string;
}

const toFormState = (settings: GameSettings): SettingsFormState => {
  return {
    winningScore: String(settings.winningScore),
    paddleSpeed: String(settings.paddleSpeed),
    ballSpeed: String(settings.ballSpeed),
    aiDifficulty: String(settings.aiDifficulty)
  };
};

const parseFormState = (form: SettingsFormState): Partial<GameSettings> => {
  return {
    winningScore: Number.parseInt(form.winningScore, 10),
    paddleSpeed: Number.parseInt(form.paddleSpeed, 10),
    ballSpeed: Number.parseInt(form.ballSpeed, 10),
    aiDifficulty: Number.parseInt(form.aiDifficulty, 10)
  };
};

const FIELD_IDS: Record<keyof GameSettings, string> = {
  winningScore: "setting-winning-score",
  paddleSpeed: "setting-paddle-speed",
  ballSpeed: "setting-ball-speed",
  aiDifficulty: "setting-ai-difficulty"
};

export function SettingsPanel(props: SettingsPanelProps) {
  const [form, setForm] = useState<SettingsFormState>(() =>
    toFormState(props.module.getCurrentSettings())
  );
  const [errors, setErrors] = useState<SettingsValidationErrors>({});
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const current = props.module.getCurrentSettings();
    setForm(toFormState(current));
  }, [props.module]);

  const updateField = (field: SettingsField, value: string): void => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const save = (): void => {
    const result = props.module.saveSettings(parseFormState(form));

    if (!result.ok) {
      setErrors(result.errors);
      setStatus("Review highlighted fields, then apply again.");
      return;
    }

    setErrors({});
    setStatus("Settings applied.");
    props.onApply(result.settings);
  };

  const reset = (): void => {
    const defaults = props.module.resetSettings();
    setForm(toFormState(defaults));
    setErrors({});
    setStatus("Defaults restored.");
    props.onApply(defaults);
  };

  return (
    <section aria-label="Gameplay settings" className="settings-panel">
      <header className="settings-header">
        <h2>Match Settings</h2>
        {status ? (
          <span aria-live="polite" className="settings-status" role="status">
            {status}
          </span>
        ) : null}
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="settings-grid">
          <label className="field">
            <span>Winning Score</span>
            <input
              id={FIELD_IDS.winningScore}
              type="number"
              value={form.winningScore}
              onChange={(event) => updateField("winningScore", event.target.value)}
              min={1}
              max={21}
              aria-invalid={Boolean(errors.winningScore)}
              aria-describedby={errors.winningScore ? `${FIELD_IDS.winningScore}-error` : undefined}
            />
            {errors.winningScore ? (
              <small className="field-error" id={`${FIELD_IDS.winningScore}-error`}>
                {errors.winningScore}
              </small>
            ) : null}
          </label>

          <label className="field">
            <span>Paddle Speed</span>
            <input
              id={FIELD_IDS.paddleSpeed}
              type="number"
              value={form.paddleSpeed}
              onChange={(event) => updateField("paddleSpeed", event.target.value)}
              min={250}
              max={900}
              aria-invalid={Boolean(errors.paddleSpeed)}
              aria-describedby={errors.paddleSpeed ? `${FIELD_IDS.paddleSpeed}-error` : undefined}
            />
            {errors.paddleSpeed ? (
              <small className="field-error" id={`${FIELD_IDS.paddleSpeed}-error`}>
                {errors.paddleSpeed}
              </small>
            ) : null}
          </label>

          <label className="field">
            <span>Ball Speed</span>
            <input
              id={FIELD_IDS.ballSpeed}
              type="number"
              value={form.ballSpeed}
              onChange={(event) => updateField("ballSpeed", event.target.value)}
              min={200}
              max={900}
              aria-invalid={Boolean(errors.ballSpeed)}
              aria-describedby={errors.ballSpeed ? `${FIELD_IDS.ballSpeed}-error` : undefined}
            />
            {errors.ballSpeed ? (
              <small className="field-error" id={`${FIELD_IDS.ballSpeed}-error`}>
                {errors.ballSpeed}
              </small>
            ) : null}
          </label>

          <label className="field">
            <span>AI Difficulty (1-10)</span>
            <input
              id={FIELD_IDS.aiDifficulty}
              type="number"
              value={form.aiDifficulty}
              onChange={(event) => updateField("aiDifficulty", event.target.value)}
              min={1}
              max={10}
              aria-invalid={Boolean(errors.aiDifficulty)}
              aria-describedby={errors.aiDifficulty ? `${FIELD_IDS.aiDifficulty}-error` : undefined}
            />
            {errors.aiDifficulty ? (
              <small className="field-error" id={`${FIELD_IDS.aiDifficulty}-error`}>
                {errors.aiDifficulty}
              </small>
            ) : null}
          </label>
        </div>

        <div className="settings-actions">
          <button className="button" type="submit">
            Apply
          </button>
          <button className="button button-muted" type="button" onClick={reset}>
            Reset Defaults
          </button>
        </div>
      </form>
    </section>
  );
}
