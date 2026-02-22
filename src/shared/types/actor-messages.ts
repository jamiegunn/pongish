import type { ActorId, MatchId, SaveGameId } from "@/shared/types/ids";

export interface ActorEnvelope<TType extends string, TPayload> {
  readonly type: TType;
  readonly payload: TPayload;
  readonly timestampMs: number;
}

export type AppActorMessage =
  | StartMatchMessage
  | TickMessage
  | PauseMatchMessage
  | ResumeMatchMessage
  | SaveGameMessage
  | LoadGameMessage;

export type StartMatchMessage = ActorEnvelope<
  "StartMatch",
  {
    matchId: MatchId;
    winningScore: number;
    actorId: ActorId;
  }
>;

export type TickMessage = ActorEnvelope<
  "Tick",
  {
    deltaMs: number;
  }
>;

export type PauseMatchMessage = ActorEnvelope<"PauseMatch", { reason: "manual" | "window_blur" }>;

export type ResumeMatchMessage = ActorEnvelope<"ResumeMatch", { reason: "manual" }>;

export type SaveGameMessage = ActorEnvelope<
  "SaveGame",
  {
    saveId: SaveGameId;
    matchId: MatchId;
  }
>;

export type LoadGameMessage = ActorEnvelope<
  "LoadGame",
  {
    saveId: SaveGameId;
  }
>;
