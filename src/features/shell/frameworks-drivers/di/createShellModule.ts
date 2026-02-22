import type { FeatureModule, SharedDependencies } from "@/app/frameworks-drivers/di/module-types";
import { ShellNavigationUseCase } from "@/features/shell/application";
import type { ShellView } from "@/features/shell/domain";

export interface ShellNavigationController {
  readonly getView: () => ShellView;
  readonly subscribe: (listener: (view: ShellView) => void) => () => void;
  readonly goTo: (view: ShellView) => void;
}

export interface ShellModule extends FeatureModule {
  readonly createNavigationController: (initialView?: ShellView) => ShellNavigationController;
}

const createNavigationController = (initialView: ShellView = "play"): ShellNavigationController => {
  const useCase = new ShellNavigationUseCase(initialView);
  const listeners = new Set<(view: ShellView) => void>();

  const publish = (): void => {
    const nextView = useCase.getSnapshot().currentView;
    listeners.forEach((listener) => {
      listener(nextView);
    });
  };

  return {
    getView: () => useCase.getSnapshot().currentView,
    subscribe: (listener) => {
      listeners.add(listener);
      listener(useCase.getSnapshot().currentView);
      return () => {
        listeners.delete(listener);
      };
    },
    goTo: (view) => {
      useCase.goTo(view);
      publish();
    }
  };
};

export const createShellModule = (_deps: SharedDependencies): ShellModule => {
  return {
    name: "shell",
    createNavigationController: (initialView) => createNavigationController(initialView)
  };
};
