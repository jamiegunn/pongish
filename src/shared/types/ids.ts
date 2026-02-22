type Brand<T, Tag extends string> = T & { readonly __brand: Tag };

export type ActorId = Brand<string, "ActorId">;
export type MatchId = Brand<string, "MatchId">;
export type SaveGameId = Brand<string, "SaveGameId">;
export type PlayerId = Brand<string, "PlayerId">;

const createId = (prefix: string): string => {
  return `${prefix}_${crypto.randomUUID()}`;
};

export const createActorId = (): ActorId => createId("actor") as ActorId;
export const createMatchId = (): MatchId => createId("match") as MatchId;
export const createSaveGameId = (): SaveGameId => createId("save") as SaveGameId;
export const createPlayerId = (): PlayerId => createId("player") as PlayerId;
