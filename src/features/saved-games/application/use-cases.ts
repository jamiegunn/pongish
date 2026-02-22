import { AUTOSAVE_ID, toSavedGameSummary } from "@/features/saved-games/domain";
import type {
  SavedGameRecord,
  SavedGameSource,
  SavedGameSummary
} from "@/features/saved-games/domain";

export interface SavedGamesRepositoryPort {
  put: (record: SavedGameRecord) => Promise<void>;
  getById: (id: string) => Promise<SavedGameRecord | null>;
  list: () => Promise<SavedGameRecord[]>;
  deleteById: (id: string) => Promise<void>;
}

export interface SaveGameInput {
  readonly source: SavedGameSource;
  readonly payload: unknown;
  readonly id?: string;
  readonly label?: string;
}

export interface SavedGamesUseCasesOptions {
  readonly repository: SavedGamesRepositoryPort;
  readonly nowMs: () => number;
  readonly createId: () => string;
}

export class SavedGamesUseCases {
  private readonly repository: SavedGamesRepositoryPort;
  private readonly nowMs: () => number;
  private readonly createId: () => string;

  constructor(options: SavedGamesUseCasesOptions) {
    this.repository = options.repository;
    this.nowMs = options.nowMs;
    this.createId = options.createId;
  }

  async saveGame(input: SaveGameInput): Promise<SavedGameSummary> {
    const now = this.nowMs();
    const id = input.id ?? this.createId();
    const existing = await this.repository.getById(id);

    const record: SavedGameRecord = {
      id,
      label: input.label ?? (input.source === "autosave" ? "Autosave" : "Manual Save"),
      source: input.source,
      payload: input.payload,
      createdAtMs: existing?.createdAtMs ?? now,
      updatedAtMs: now
    };

    await this.repository.put(record);
    return toSavedGameSummary(record);
  }

  async saveAutosave(payload: unknown): Promise<SavedGameSummary> {
    return this.saveGame({
      id: AUTOSAVE_ID,
      source: "autosave",
      label: "Autosave",
      payload
    });
  }

  async listGames(): Promise<SavedGameSummary[]> {
    const records = await this.repository.list();
    return records
      .slice()
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs)
      .map((record) => toSavedGameSummary(record));
  }

  async loadGame(id: string): Promise<SavedGameRecord | null> {
    return this.repository.getById(id);
  }

  async deleteGame(id: string): Promise<void> {
    await this.repository.deleteById(id);
  }
}
