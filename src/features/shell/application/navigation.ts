import type { ShellView } from "@/features/shell/domain";

export interface ShellNavigationSnapshot {
  readonly currentView: ShellView;
}

export class ShellNavigationUseCase {
  private currentView: ShellView;

  constructor(initialView: ShellView = "play") {
    this.currentView = initialView;
  }

  goTo(view: ShellView): ShellNavigationSnapshot {
    this.currentView = view;
    return this.getSnapshot();
  }

  getSnapshot(): ShellNavigationSnapshot {
    return {
      currentView: this.currentView
    };
  }
}
