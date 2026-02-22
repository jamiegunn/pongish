export interface ClockPort {
  nowMs: () => number;
}

export class BrowserClock implements ClockPort {
  nowMs(): number {
    return performance.now();
  }
}
