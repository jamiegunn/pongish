import type { PowerUpSlotState } from "@/features/pong-game/frameworks-drivers/powerup-ui-types";

interface PaddleRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface PowerUpCue {
  readonly update: (dtMs: number, state: PowerUpSlotState, paddleRect: PaddleRect) => void;
  readonly draw: (context: CanvasRenderingContext2D) => void;
  readonly setReduceMotion: (reduceMotion: boolean) => void;
}

interface CueOptions {
  readonly reduceMotion?: boolean;
  readonly facing?: "left" | "right";
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

export const createPowerUpCue = (options?: CueOptions): PowerUpCue => {
  let reduceMotion = Boolean(options?.reduceMotion);
  const facing = options?.facing ?? "right";
  let previousState: PowerUpSlotState = "empty";
  let readyAlpha = 0;
  let dashOffset = 0;
  let pulseTimeMs = 0;
  let burstMs = 0;
  const burstTotalMs = 280;
  let paddle: PaddleRect = { x: 0, y: 0, w: 0, h: 0 };

  return {
    update: (dtMs: number, state: PowerUpSlotState, paddleRect: PaddleRect) => {
      const dt = clamp(dtMs, 0, 80);
      paddle = paddleRect;
      pulseTimeMs += dt;

      const isReady = state === "ready";

      if (isReady) {
        readyAlpha = clamp(readyAlpha + dt * 0.007, 0, 1);

        if (!reduceMotion) {
          dashOffset += dt * 0.06;
        }

        if (previousState !== "ready") {
          burstMs = burstTotalMs;
        }
      } else {
        readyAlpha = clamp(readyAlpha - dt * 0.0045, 0, 1);
      }

      if (burstMs > 0) {
        burstMs = Math.max(0, burstMs - dt);
      }

      previousState = state;
    },
    draw: (ctx: CanvasRenderingContext2D) => {
      if (readyAlpha <= 0.001) {
        return;
      }

      const { x, y, w, h } = paddle;
      const pulse = reduceMotion ? 1 : 0.78 + 0.22 * Math.sin(pulseTimeMs / 210);
      const alpha = readyAlpha * pulse;
      const edgeX = facing === "right" ? x + w + 1.5 : x - 1.5;
      const direction = facing === "right" ? 1 : -1;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      ctx.globalAlpha = 0.1 * alpha;
      ctx.fillStyle = "rgba(255, 196, 118, 1)";
      ctx.beginPath();
      ctx.roundRect(x - 6, y - 6, w + 12, h + 12, 10);
      ctx.fill();

      ctx.globalAlpha = 0.55 * alpha;
      ctx.strokeStyle = "rgba(255, 231, 180, 1)";
      ctx.lineWidth = 2;
      if (!reduceMotion) {
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = -dashOffset;
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(edgeX, y - 2);
      ctx.lineTo(edgeX, y + h + 2);
      ctx.stroke();

      ctx.globalAlpha = 0.25 * alpha;
      ctx.strokeStyle = "rgba(255, 255, 245, 1)";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(edgeX + 2 * direction, y);
      ctx.lineTo(edgeX + 2 * direction, y + h);
      ctx.stroke();

      if (!reduceMotion && burstMs > 0.01) {
        const burstProgress = 1 - burstMs / burstTotalMs;
        const burstAlpha = (1 - burstProgress) * alpha;
        const baseLen = 6;
        const extraLen = 12 * (1 - burstProgress);

        ctx.globalAlpha = 0.55 * burstAlpha;
        ctx.strokeStyle = "rgba(255, 214, 160, 1)";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);

        for (let index = 0; index < 6; index += 1) {
          const tickY = y + (h * (index + 1)) / 7;
          const length = baseLen + extraLen;
          ctx.beginPath();
          ctx.moveTo(edgeX + 2 * direction, tickY);
          ctx.lineTo(edgeX + (2 + length) * direction, tickY);
          ctx.stroke();
        }
      }

      ctx.restore();
    },
    setReduceMotion: (nextReduceMotion: boolean) => {
      reduceMotion = nextReduceMotion;
    }
  };
};
