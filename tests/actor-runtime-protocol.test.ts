import { createActorRuntime } from "@/shared/actors/runtime";

describe("actor runtime protocol", () => {
  test("processes messages in FIFO order for an actor", () => {
    const runtime = createActorRuntime();
    const received: number[] = [];

    const actor = runtime.spawn<number>((message) => {
      received.push(message);
    });

    actor.send(1);
    actor.send(2);
    actor.send(3);

    const processed = runtime.flush();

    expect(processed).toBe(3);
    expect(received).toEqual([1, 2, 3]);
  });

  test("processes follow-up messages enqueued by other actors", () => {
    const runtime = createActorRuntime();
    const events: string[] = [];

    const worker = runtime.spawn<string>((message) => {
      events.push(`worker:${message}`);
    });

    const coordinator = runtime.spawn<string>((message) => {
      events.push(`coordinator:${message}`);
      worker.send("ack");
    });

    coordinator.send("start");
    const processed = runtime.flush();

    expect(processed).toBe(2);
    expect(events).toEqual(["coordinator:start", "worker:ack"]);
  });
});
