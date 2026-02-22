export type SavedGameSource = "manual" | "autosave";

export interface SavedGameRecord {
  readonly id: string;
  readonly label: string;
  readonly source: SavedGameSource;
  readonly payload: unknown;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export interface SavedGameSummary {
  readonly id: string;
  readonly label: string;
  readonly source: SavedGameSource;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export const AUTOSAVE_ID = "autosave";

export const toSavedGameSummary = (record: SavedGameRecord): SavedGameSummary => {
  return {
    id: record.id,
    label: record.label,
    source: record.source,
    createdAtMs: record.createdAtMs,
    updatedAtMs: record.updatedAtMs
  };
};
