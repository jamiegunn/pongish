import type { ActorId, AppActorMessage } from "@/shared/types";
import { createActorId } from "@/shared/types";

export interface ActorRef<TMessage> {
  readonly id: ActorId;
  send: (message: TMessage) => void;
}

export interface SpawnOptions {
  readonly id?: ActorId;
}

export type ActorHandler<TMessage> = (message: TMessage) => void;

export interface ActorRuntime {
  readonly rootActor: ActorRef<AppActorMessage>;
  spawn: <TMessage>(handler: ActorHandler<TMessage>, options?: SpawnOptions) => ActorRef<TMessage>;
  flush: (maxMessages?: number) => number;
}

interface RuntimeEnvelope {
  readonly targetId: ActorId;
  readonly message: unknown;
}

class InMemoryMailbox {
  private readonly queue: RuntimeEnvelope[] = [];

  enqueue(envelope: RuntimeEnvelope): void {
    this.queue.push(envelope);
  }

  next(): RuntimeEnvelope | undefined {
    return this.queue.shift();
  }

  get size(): number {
    return this.queue.length;
  }
}

export const createActorRuntime = (): ActorRuntime => {
  const mailbox = new InMemoryMailbox();
  const handlers = new Map<ActorId, (message: unknown) => void>();

  const createRef = <TMessage>(id: ActorId): ActorRef<TMessage> => {
    return {
      id,
      send: (message) => {
        mailbox.enqueue({ targetId: id, message });
      }
    };
  };

  const spawn: ActorRuntime["spawn"] = (handler, options) => {
    const id = options?.id ?? createActorId();
    handlers.set(id, handler as (message: unknown) => void);
    return createRef(id);
  };

  const rootActor = spawn<AppActorMessage>(() => {
    // Root actor acts as a mailbox sink for app-level commands.
  });

  const flush: ActorRuntime["flush"] = (maxMessages = 20_000) => {
    let processed = 0;

    while (processed < maxMessages && mailbox.size > 0) {
      const envelope = mailbox.next();

      if (!envelope) {
        break;
      }

      const handler = handlers.get(envelope.targetId);

      if (handler) {
        handler(envelope.message);
      }

      processed += 1;
    }

    return processed;
  };

  return {
    rootActor,
    spawn,
    flush
  };
};
