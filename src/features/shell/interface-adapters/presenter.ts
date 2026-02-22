import type { ShellView } from "@/features/shell/domain";

export interface ShellTabViewModel {
  readonly id: ShellView;
  readonly label: string;
}

export const SHELL_TABS: readonly ShellTabViewModel[] = [
  { id: "play", label: "Play" },
  { id: "settings", label: "Settings" }
] as const;
