import type { SavedGameSummary } from "@/features/saved-games/domain";

export interface SavedGameListItemViewModel {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly isAutosave: boolean;
}

export const presentSavedGameListItem = (
  summary: SavedGameSummary,
  locale: string = "en-US"
): SavedGameListItemViewModel => {
  const updatedAt = new Date(summary.updatedAtMs).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  });

  return {
    id: summary.id,
    title: summary.label,
    subtitle: `Updated ${updatedAt}`,
    isAutosave: summary.source === "autosave"
  };
};
