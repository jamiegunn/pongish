import type { FeatureModule, SharedDependencies } from "@/app/frameworks-drivers/di/module-types";
import { SavedGamesUseCases } from "@/features/saved-games/application";
import type { SaveGameInput, SavedGamesUseCasesOptions } from "@/features/saved-games/application";
import type { SavedGameRecord, SavedGameSummary } from "@/features/saved-games/domain";
import { createSaveGameId } from "@/shared/types";
import { createSavedGamesRepository } from "@/features/saved-games/frameworks-drivers/indexeddb-saved-games-repository";

export interface SavedGamesModule extends FeatureModule {
  readonly saveGame: (input: SaveGameInput) => Promise<SavedGameSummary>;
  readonly saveAutosave: (payload: unknown) => Promise<SavedGameSummary>;
  readonly listGames: () => Promise<SavedGameSummary[]>;
  readonly loadGame: (id: string) => Promise<SavedGameRecord | null>;
  readonly deleteGame: (id: string) => Promise<void>;
}

const createSavedGamesUseCases = (_deps: SharedDependencies): SavedGamesUseCases => {
  const options: SavedGamesUseCasesOptions = {
    repository: createSavedGamesRepository(),
    nowMs: () => Date.now(),
    createId: () => createSaveGameId()
  };

  return new SavedGamesUseCases(options);
};

export const createSavedGamesModule = (deps: SharedDependencies): SavedGamesModule => {
  const useCases = createSavedGamesUseCases(deps);

  return {
    name: "saved-games",
    saveGame: (input) => useCases.saveGame(input),
    saveAutosave: (payload) => useCases.saveAutosave(payload),
    listGames: () => useCases.listGames(),
    loadGame: (id) => useCases.loadGame(id),
    deleteGame: (id) => useCases.deleteGame(id)
  };
};
