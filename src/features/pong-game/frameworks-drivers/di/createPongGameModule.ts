import type { FeatureModule, SharedDependencies } from "@/app/frameworks-drivers/di/module-types";
import type {
  GameSessionSnapshot,
  PauseReason,
  PongGameSessionUseCase
} from "@/features/pong-game/application";
import { PongGameSessionUseCase as PongGameSessionUseCaseImpl } from "@/features/pong-game/application";
import type { PaddleDirection, PongGameConfig, Side } from "@/features/pong-game/domain";
import type { PongViewModel } from "@/features/pong-game/interface-adapters";
import { presentPongViewModel } from "@/features/pong-game/interface-adapters";

interface SessionActorMessage {
  readonly type:
    | "start"
    | "reset"
    | "tick"
    | "pause"
    | "resume"
    | "set_player_direction"
    | "load_snapshot"
    | "activate_powerup"
    | "activate_mortality";
  readonly payload?: {
    readonly deltaMs?: number;
    readonly reason?: PauseReason;
    readonly direction?: PaddleDirection;
    readonly snapshot?: GameSessionSnapshot;
    readonly side?: Side;
  };
}

export interface PongGameSession {
  readonly getViewModel: () => PongViewModel;
  readonly subscribe: (listener: (model: PongViewModel) => void) => () => void;
  readonly start: () => void;
  readonly reset: () => void;
  readonly tick: (deltaMs: number) => void;
  readonly pause: (reason: PauseReason) => void;
  readonly resume: () => void;
  readonly setPlayerDirection: (direction: PaddleDirection) => void;
  readonly activatePowerup: (side: Side) => void;
  readonly activateMortality: () => void;
  readonly exportSnapshot: () => GameSessionSnapshot;
  readonly loadSnapshot: (snapshot: GameSessionSnapshot) => void;
  readonly dispose: () => void;
}

export interface PongGameModule extends FeatureModule {
  readonly createSession: (configOverrides?: Partial<PongGameConfig>) => PongGameSession;
}

const buildViewModel = (session: PongGameSessionUseCase): PongViewModel => {
  const snapshot = session.getSnapshot();
  return presentPongViewModel(snapshot.state, snapshot.config);
};

const createSession = (
  deps: SharedDependencies,
  configOverrides?: Partial<PongGameConfig>
): PongGameSession => {
  const session = new PongGameSessionUseCaseImpl(configOverrides);
  const listeners = new Set<(model: PongViewModel) => void>();

  const publish = (): void => {
    const viewModel = buildViewModel(session);
    listeners.forEach((listener) => {
      listener(viewModel);
    });
  };

  const actor = deps.actorRuntime.spawn<SessionActorMessage>((message) => {
    switch (message.type) {
      case "start":
        session.dispatch({ type: "start" });
        publish();
        break;
      case "reset":
        session.dispatch({ type: "reset" });
        publish();
        break;
      case "tick":
        session.dispatch({
          type: "tick",
          deltaMs: message.payload?.deltaMs ?? 0
        });
        publish();
        break;
      case "pause":
        session.dispatch({
          type: "pause",
          reason: message.payload?.reason ?? "manual"
        });
        publish();
        break;
      case "resume":
        session.dispatch({ type: "resume" });
        publish();
        break;
      case "set_player_direction":
        session.dispatch({
          type: "set_player_direction",
          direction: message.payload?.direction ?? 0
        });
        break;
      case "load_snapshot":
        if (message.payload?.snapshot) {
          session.loadSnapshot(message.payload.snapshot);
          publish();
        }
        break;
      case "activate_powerup":
        if (message.payload?.side) {
          session.dispatch({
            type: "activate_powerup",
            side: message.payload.side
          });
          publish();
        }
        break;
      case "activate_mortality":
        session.dispatch({ type: "activate_mortality" });
        publish();
        break;
    }
  });

  const send = (message: SessionActorMessage): void => {
    actor.send(message);
    deps.actorRuntime.flush();
  };

  return {
    getViewModel: () => buildViewModel(session),
    subscribe: (listener) => {
      listeners.add(listener);
      listener(buildViewModel(session));
      return () => {
        listeners.delete(listener);
      };
    },
    start: () => {
      send({ type: "start" });
    },
    reset: () => {
      send({ type: "reset" });
    },
    tick: (deltaMs) => {
      send({
        type: "tick",
        payload: { deltaMs }
      });
    },
    pause: (reason) => {
      send({
        type: "pause",
        payload: { reason }
      });
    },
    resume: () => {
      send({ type: "resume" });
    },
    setPlayerDirection: (direction) => {
      send({
        type: "set_player_direction",
        payload: { direction }
      });
    },
    activatePowerup: (side) => {
      send({
        type: "activate_powerup",
        payload: { side }
      });
    },
    activateMortality: () => {
      send({ type: "activate_mortality" });
    },
    exportSnapshot: () => session.getSnapshot(),
    loadSnapshot: (snapshot) => {
      send({
        type: "load_snapshot",
        payload: { snapshot }
      });
    },
    dispose: () => {
      listeners.clear();
      send({
        type: "set_player_direction",
        payload: { direction: 0 }
      });
    }
  };
};

export const createPongGameModule = (deps: SharedDependencies): PongGameModule => {
  return {
    name: "pong-game",
    createSession: (configOverrides) => {
      return createSession(deps, configOverrides);
    }
  };
};
