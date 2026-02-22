import { useEffect, useMemo, useRef, useState } from "react";
import { createPowerUpCue } from "@/features/pong-game/frameworks-drivers/canvas/powerUpCue";
import type { PowerUpSlotState } from "@/features/pong-game/frameworks-drivers/powerup-ui-types";
import type { PongViewModel } from "@/features/pong-game/interface-adapters";

interface PongCanvasProps {
  readonly viewModel: PongViewModel;
  readonly showHeatmap: boolean;
  readonly playerPowerupState: PowerUpSlotState;
  readonly reduceMotion: boolean;
}

interface HeatPoint {
  readonly x: number;
  readonly y: number;
  readonly intensity: number;
}

interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

const MAX_TRAIL_POINTS = 160;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  const effectiveRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + effectiveRadius, y);
  context.lineTo(x + width - effectiveRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + effectiveRadius);
  context.lineTo(x + width, y + height - effectiveRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - effectiveRadius, y + height);
  context.lineTo(x + effectiveRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - effectiveRadius);
  context.lineTo(x, y + effectiveRadius);
  context.quadraticCurveTo(x, y, x + effectiveRadius, y);
  context.closePath();
};

export function PongCanvas(props: PongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const heatTrailRef = useRef<HeatPoint[]>([]);
  const previousPhaseRef = useRef(props.viewModel.phase);
  const previousScoreRef = useRef(props.viewModel.scoreText);
  const powerUpCueRef = useRef(createPowerUpCue({ reduceMotion: props.reduceMotion, facing: "right" }));
  const lastDrawTimeMsRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const host = canvas.parentElement ?? canvas;

    const resize = (): void => {
      setCanvasSize({
        width: host.clientWidth,
        height: host.clientHeight
      });
    };

    resize();

    const observer = new ResizeObserver(() => {
      resize();
    });

    observer.observe(host);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const isHardReset =
      props.viewModel.phase === "idle" &&
      props.viewModel.scoreText === "0 : 0" &&
      previousScoreRef.current !== "0 : 0";

    if (isHardReset) {
      heatTrailRef.current = [];
    }

    if (props.viewModel.phase === "completed" && previousPhaseRef.current !== "completed") {
      heatTrailRef.current = heatTrailRef.current.slice(-Math.floor(MAX_TRAIL_POINTS / 2));
    }

    previousPhaseRef.current = props.viewModel.phase;
    previousScoreRef.current = props.viewModel.scoreText;

    const speed = Math.sqrt(
      props.viewModel.ball.vx * props.viewModel.ball.vx + props.viewModel.ball.vy * props.viewModel.ball.vy
    );
    const normalizedIntensity = clamp(speed / 900, 0.18, 0.75);

    heatTrailRef.current = [
      ...heatTrailRef.current,
      {
        x: props.viewModel.ball.x,
        y: props.viewModel.ball.y,
        intensity: normalizedIntensity
      }
    ].slice(-MAX_TRAIL_POINTS);
  }, [
    props.viewModel.ball.vx,
    props.viewModel.ball.vy,
    props.viewModel.ball.x,
    props.viewModel.ball.y,
    props.viewModel.phase,
    props.viewModel.scoreText
  ]);

  const fieldScale = useMemo(() => {
    if (canvasSize.width <= 0 || canvasSize.height <= 0) {
      return {
        x: 1,
        y: 1
      };
    }

    return {
      x: canvasSize.width / props.viewModel.arena.width,
      y: canvasSize.height / props.viewModel.arena.height
    };
  }, [canvasSize.height, canvasSize.width, props.viewModel.arena.height, props.viewModel.arena.width]);

  useEffect(() => {
    powerUpCueRef.current.setReduceMotion(props.reduceMotion);
  }, [props.reduceMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const cssWidth = Math.max(1, Math.round(canvasSize.width));
    const cssHeight = Math.max(1, Math.round(canvasSize.height));
    const dpr = Math.max(1, window.devicePixelRatio ?? 1);

    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);

    const arenaWidth = cssWidth;
    const arenaHeight = cssHeight;
    const nowMs = performance.now();
    const dtMs =
      lastDrawTimeMsRef.current === null
        ? 16.67
        : clamp(nowMs - lastDrawTimeMsRef.current, 0, 80);
    lastDrawTimeMsRef.current = nowMs;

    const baseGradient = context.createLinearGradient(0, 0, 0, arenaHeight);
    baseGradient.addColorStop(0, "#11130e");
    baseGradient.addColorStop(0.5, "#171e12");
    baseGradient.addColorStop(1, "#0e120c");
    context.fillStyle = baseGradient;
    context.fillRect(0, 0, arenaWidth, arenaHeight);

    const centerGlow = context.createRadialGradient(
      arenaWidth / 2,
      arenaHeight / 2,
      8,
      arenaWidth / 2,
      arenaHeight / 2,
      arenaWidth * 0.48
    );
    centerGlow.addColorStop(0, "rgba(255, 175, 62, 0.11)");
    centerGlow.addColorStop(1, "rgba(255, 175, 62, 0)");
    context.fillStyle = centerGlow;
    context.fillRect(0, 0, arenaWidth, arenaHeight);

    if (props.showHeatmap && heatTrailRef.current.length > 1) {
      context.save();
      context.globalCompositeOperation = "source-over";

      heatTrailRef.current.forEach((point, index, trail) => {
        if (index % 2 !== 0) {
          return;
        }
        const weight = (index + 1) / trail.length;
        const px = point.x * fieldScale.x;
        const py = point.y * fieldScale.y;
        const radius = 7 + weight * 10 + point.intensity * 5;

        const gradient = context.createRadialGradient(px, py, 0, px, py, radius);
        gradient.addColorStop(0, `rgba(255, 166, 92, ${0.08 * weight * point.intensity})`);
        gradient.addColorStop(0.7, `rgba(255, 229, 177, ${0.045 * weight})`);
        gradient.addColorStop(1, "rgba(255, 230, 107, 0)");

        context.fillStyle = gradient;
        context.beginPath();
        context.arc(px, py, radius, 0, Math.PI * 2);
        context.fill();
      });

      context.restore();
    }

    context.save();
    context.strokeStyle = "rgba(240, 220, 146, 0.32)";
    context.lineWidth = 2;
    context.setLineDash([12, 10]);
    context.beginPath();
    context.moveTo(arenaWidth / 2, 14);
    context.lineTo(arenaWidth / 2, arenaHeight - 14);
    context.stroke();
    context.restore();

    for (let y = 0; y < arenaHeight; y += 4) {
      context.fillStyle = y % 8 === 0 ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.08)";
      context.fillRect(0, y, arenaWidth, 2);
    }

    const drawPaddle = (
      side: "left" | "right",
      x: number,
      y: number,
      width: number,
      height: number
    ): void => {
      const effects =
        side === "left"
          ? {
              grow: props.viewModel.powerups.activeEffects.leftPaddleGrow,
              speed: props.viewModel.powerups.activeEffects.leftSpeedBurst,
              slowed: props.viewModel.powerups.activeEffects.leftSlowed,
              shield: props.viewModel.powerups.shieldLeft > 0
            }
          : {
              grow: props.viewModel.powerups.activeEffects.rightPaddleGrow,
              speed: props.viewModel.powerups.activeEffects.rightSpeedBurst,
              slowed: props.viewModel.powerups.activeEffects.rightSlowed,
              shield: props.viewModel.powerups.shieldRight > 0
            };

      context.save();
      context.shadowColor = effects.slowed
        ? "rgba(255, 92, 92, 0.6)"
        : effects.speed
          ? "rgba(103, 229, 255, 0.66)"
          : "rgba(255, 176, 59, 0.45)";
      context.shadowBlur = effects.speed ? 20 : 14;
      drawRoundedRect(context, x, y, width, height, 6);
      context.fillStyle = "#f6d08c";
      context.fill();
      context.restore();

      context.save();
      drawRoundedRect(context, x + 1, y + 1, width - 2, height - 2, 5);
      context.strokeStyle = "rgba(76, 44, 17, 0.4)";
      context.lineWidth = 1;
      context.stroke();
      context.restore();

      if (effects.grow || effects.speed || effects.slowed || effects.shield) {
        context.save();
        drawRoundedRect(context, x - 3, y - 3, width + 6, height + 6, 8);
        context.lineWidth = 2;
        context.strokeStyle = effects.slowed
          ? "rgba(255, 118, 118, 0.9)"
          : effects.speed
            ? "rgba(116, 237, 255, 0.9)"
            : effects.grow
              ? "rgba(147, 255, 170, 0.9)"
              : "rgba(255, 231, 150, 0.9)";
        context.stroke();
        context.restore();
      }
    };

    drawPaddle(
      "left",
      props.viewModel.paddles.left.x * fieldScale.x,
      props.viewModel.paddles.left.y * fieldScale.y,
      props.viewModel.paddles.left.width * fieldScale.x,
      props.viewModel.paddles.left.height * fieldScale.y
    );

    drawPaddle(
      "right",
      props.viewModel.paddles.right.x * fieldScale.x,
      props.viewModel.paddles.right.y * fieldScale.y,
      props.viewModel.paddles.right.width * fieldScale.x,
      props.viewModel.paddles.right.height * fieldScale.y
    );

    powerUpCueRef.current.update(dtMs, props.playerPowerupState, {
      x: props.viewModel.paddles.left.x * fieldScale.x,
      y: props.viewModel.paddles.left.y * fieldScale.y,
      w: props.viewModel.paddles.left.width * fieldScale.x,
      h: props.viewModel.paddles.left.height * fieldScale.y
    });
    powerUpCueRef.current.draw(context);

    const ballX = props.viewModel.ball.x * fieldScale.x;
    const ballY = props.viewModel.ball.y * fieldScale.y;
    const ballRadius = Math.max(3.5, props.viewModel.ball.radius * ((fieldScale.x + fieldScale.y) / 2));

    context.save();
    context.shadowColor = "rgba(255, 240, 171, 0.85)";
    context.shadowBlur = 24;
    context.fillStyle = "#fff0c7";
    context.beginPath();
    context.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    context.fill();
    context.restore();

    if (props.viewModel.mortality.activeMode === "no-ai-score") {
      context.save();
      context.fillStyle = "rgba(126, 240, 255, 0.32)";
      context.fillRect(0, 0, 10, arenaHeight);
      context.restore();
    }

    if (props.viewModel.mortality.activeMode === "unstoppable-shot") {
      context.save();
      context.fillStyle = "rgba(255, 106, 106, 0.36)";
      context.fillRect(arenaWidth - 10, 0, 10, arenaHeight);
      context.restore();
    }

    const vignette = context.createRadialGradient(
      arenaWidth / 2,
      arenaHeight / 2,
      Math.min(arenaWidth, arenaHeight) * 0.34,
      arenaWidth / 2,
      arenaHeight / 2,
      Math.max(arenaWidth, arenaHeight) * 0.82
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.36)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, arenaWidth, arenaHeight);

    context.strokeStyle = "rgba(240, 203, 126, 0.32)";
    context.lineWidth = 2;
    drawRoundedRect(context, 3, 3, arenaWidth - 6, arenaHeight - 6, 10);
    context.stroke();
  }, [
    canvasSize.height,
    canvasSize.width,
    fieldScale.x,
    fieldScale.y,
    props.playerPowerupState,
    props.showHeatmap,
    props.viewModel
  ]);

  return <canvas aria-label="Pong arena" className="pong-canvas" ref={canvasRef} />;
}
