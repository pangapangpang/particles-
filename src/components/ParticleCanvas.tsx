import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Crosshair,
  Eraser,
  MousePointer,
  Move,
  Pause,
  Play,
  Sparkles,
  Target as TargetIcon,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CanvasBackground,
  InteractionMode,
  ParticleConfig,
} from '../types/particle';
import { soundEngine } from '../utils/audio';

export interface ParticleCanvasHandle {
  triggerBurst: () => void;
  clearParticles: () => void;
}

interface ParticleCanvasProps {
  config: ParticleConfig;
  background: CanvasBackground;
  onBackgroundChange: (bg: CanvasBackground) => void;
  interactionMode: InteractionMode;
  onInteractionModeChange: (mode: InteractionMode) => void;
}

interface SimParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  sizeStart: number;
  sizeEnd: number;
  rotation: number;
  rotSpeed: number;
  color: [number, number, number];
}

interface ArenaTarget {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  flash: number;
}

interface FloatingScore {
  x: number;
  y: number;
  text: string;
  age: number;
  life: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

const BG_STYLES: Record<CanvasBackground, { label: string; className: string; swatch: string }> = {
  obsidian: { label: 'Dark', className: 'bg-[#090B10]', swatch: '#090B10' },
  slate: { label: 'Slate', className: 'bg-[#1E293B]', swatch: '#1E293B' },
  light: { label: 'Light', className: 'bg-[#F8FAFC]', swatch: '#F8FAFC' },
  checker: { label: 'Alpha', className: 'canvas-checkerboard', swatch: '#334155' },
};

export const ParticleCanvas = forwardRef<ParticleCanvasHandle, ParticleCanvasProps>(
  function ParticleCanvas(
    {
      config,
      background,
      onBackgroundChange,
      interactionMode,
      onInteractionModeChange,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const configRef = useRef<ParticleConfig>(config);
    configRef.current = config;

    const modeRef = useRef<InteractionMode>(interactionMode);
    modeRef.current = interactionMode;

    const bgRef = useRef<CanvasBackground>(background);
    bgRef.current = background;

    const [isPlaying, setIsPlaying] = useState(true);
    const isPlayingRef = useRef(true);

    const [muted, setMuted] = useState(false);
    const [stats, setStats] = useState({ count: 0, fps: 60 });
    const [arenaStats, setArenaStats] = useState({ score: 0, combo: 0 });

    const particlesRef = useRef<SimParticle[]>([]);
    const emitterPosRef = useRef({ x: 300, y: 240, hasPointer: false, pointerDown: false });
    const viewportRef = useRef({ width: 600, height: 480 });
    const targetsRef = useRef<ArenaTarget[]>([]);
    const floatingScoresRef = useRef<FloatingScore[]>([]);
    const hitstopRef = useRef(0);
    const shakeRef = useRef(0);
    const comboRef = useRef({ score: 0, combo: 0, timer: 0 });

    const spawnOne = (ox: number, oy: number) => {
      const cfg = configRef.current;
      const particles = particlesRef.current;
      if (particles.length >= 1500) return;

      let x = ox;
      let y = oy;
      if (cfg.emitterShape === 'circle') {
        const r = cfg.emitterRadius * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        x = ox + Math.cos(a) * r;
        y = oy + Math.sin(a) * r;
      } else if (cfg.emitterShape === 'ring') {
        const a = Math.random() * Math.PI * 2;
        x = ox + Math.cos(a) * cfg.emitterRadius;
        y = oy + Math.sin(a) * cfg.emitterRadius;
      } else if (cfg.emitterShape === 'line') {
        x = ox + (Math.random() - 0.5) * cfg.emitterRadius * 2;
      } else if (cfg.emitterShape === 'box') {
        x = ox + (Math.random() - 0.5) * cfg.emitterRadius * 2;
        y = oy + (Math.random() - 0.5) * cfg.emitterRadius * 2;
      }

      const baseAngle = (cfg.angle * Math.PI) / 180;
      const spreadRad = (cfg.spread * Math.PI) / 180;
      const theta = baseAngle + (Math.random() - 0.5) * spreadRad;
      const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
      const scale = 1 + (Math.random() * 2 - 1) * cfg.sizeVariance;

      const paletteHex =
        cfg.palette.length > 0
          ? cfg.palette[(Math.random() * cfg.palette.length) | 0]
          : cfg.colorStart;

      particles.push({
        x,
        y,
        vx: Math.cos(theta) * speed,
        vy: Math.sin(theta) * speed,
        age: 0,
        life: Math.max(0.05, cfg.lifeMin + Math.random() * (cfg.lifeMax - cfg.lifeMin)),
        sizeStart: Math.max(0.5, cfg.sizeStart * scale),
        sizeEnd: Math.max(0, cfg.sizeEnd * scale),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: ((Math.random() < 0.5 ? -1 : 1) * cfg.rotationSpeed * Math.PI) / 180,
        color: hexToRgb(paletteHex),
      });
    };

    const emitBurstAt = (ox: number, oy: number, countOverride?: number) => {
      const count = countOverride ?? configRef.current.burstCount;
      for (let i = 0; i < count; i++) {
        spawnOne(ox, oy);
      }
    };

    useImperativeHandle(ref, () => ({
      triggerBurst() {
        const { width, height } = viewportRef.current;
        const pos = emitterPosRef.current;
        const x = modeRef.current === 'center' || !pos.hasPointer ? width / 2 : pos.x;
        const y = modeRef.current === 'center' || !pos.hasPointer ? height / 2 : pos.y;
        emitBurstAt(x, y);
        soundEngine.playBurst();
      },
      clearParticles() {
        particlesRef.current.length = 0;
        floatingScoresRef.current.length = 0;
      },
    }));

    const spawnArenaTargets = (width: number, height: number, count = 4) => {
      const pad = 64;
      const next: ArenaTarget[] = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 55 + Math.random() * 75;
        next.push({
          x: pad + Math.random() * Math.max(40, width - pad * 2),
          y: pad + 36 + Math.random() * Math.max(40, height - pad * 2 - 36),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 22 + Math.random() * 8,
          phase: Math.random() * Math.PI * 2,
          flash: 0,
        });
      }
      targetsRef.current = next;
    };

    useEffect(() => {
      if (interactionMode === 'playtest') {
        const { width, height } = viewportRef.current;
        spawnArenaTargets(width, height, 4);
        comboRef.current = { score: 0, combo: 0, timer: 0 };
        setArenaStats({ score: 0, combo: 0 });
      } else {
        targetsRef.current = [];
        floatingScoresRef.current = [];
      }
    }, [interactionMode]);

    // Trigger an initial burst when user switches to burst-only preset
    const prevEmissionModeRef = useRef(config.emissionMode);
    useEffect(() => {
      if (config.emissionMode === 'burst' && prevEmissionModeRef.current !== 'burst') {
        const { width, height } = viewportRef.current;
        emitBurstAt(width / 2, height / 2);
      }
      prevEmissionModeRef.current = config.emissionMode;
    }, [config.emissionMode]);

    useEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const resize = () => {
        const rect = container.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(240, rect.width);
        const h = Math.max(240, rect.height);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        viewportRef.current = { width: w, height: h };
        if (!emitterPosRef.current.hasPointer) {
          emitterPosRef.current.x = w / 2;
          emitterPosRef.current.y = h / 2;
        }
      };

      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(container);

      let emitAcc = 0;
      let lastTime = performance.now();
      let fpsFrames = 0;
      let fpsTimer = 0;
      let currentFps = 60;
      let statsTimer = 0;
      let rafId = 0;

      const frame = (now: number) => {
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        const dt = Math.min(Math.max(rawDt, 0), 0.05);

        fpsFrames++;
        fpsTimer += dt;
        if (fpsTimer >= 0.4) {
          currentFps = Math.round(fpsFrames / fpsTimer);
          fpsFrames = 0;
          fpsTimer = 0;
        }

        const { width, height } = viewportRef.current;
        const cfg = configRef.current;
        const mode = modeRef.current;
        const particles = particlesRef.current;

        if (isPlayingRef.current) {
          if (hitstopRef.current > 0) {
            hitstopRef.current = Math.max(0, hitstopRef.current - dt);
          } else {
            // Emitter position
            let ox = width / 2;
            let oy = height / 2;
            if (mode === 'cursor' && emitterPosRef.current.hasPointer) {
              ox = emitterPosRef.current.x;
              oy = emitterPosRef.current.y;
            } else if (mode === 'drag') {
              ox = emitterPosRef.current.x;
              oy = emitterPosRef.current.y;
            }

            const shouldEmitContinuous =
              cfg.emissionMode === 'continuous' &&
              mode !== 'playtest' &&
              (mode !== 'drag' || emitterPosRef.current.pointerDown);

            if (shouldEmitContinuous) {
              emitAcc += cfg.rate * dt;
              while (emitAcc >= 1) {
                spawnOne(ox, oy);
                emitAcc -= 1;
              }
            }

            // Update targets in playtest mode
            if (mode === 'playtest') {
              if (comboRef.current.combo > 0) {
                comboRef.current.timer -= dt;
                if (comboRef.current.timer <= 0) {
                  comboRef.current.combo = 0;
                  setArenaStats({ score: comboRef.current.score, combo: 0 });
                }
              }

              const pad = 44;
              for (const t of targetsRef.current) {
                t.phase += dt * 3;
                t.x += t.vx * dt;
                t.y += t.vy * dt;
                if (t.x < pad) {
                  t.x = pad;
                  t.vx = Math.abs(t.vx);
                } else if (t.x > width - pad) {
                  t.x = width - pad;
                  t.vx = -Math.abs(t.vx);
                }
                if (t.y < pad + 32) {
                  t.y = pad + 32;
                  t.vy = Math.abs(t.vy);
                } else if (t.y > height - pad) {
                  t.y = height - pad;
                  t.vy = -Math.abs(t.vy);
                }
                if (t.flash > 0) t.flash = Math.max(0, t.flash - dt * 5);
              }
            }

            // Update floating hit text
            for (let i = floatingScoresRef.current.length - 1; i >= 0; i--) {
              const f = floatingScoresRef.current[i];
              f.age += dt;
              f.y -= 36 * dt;
              if (f.age >= f.life) {
                floatingScoresRef.current.splice(i, 1);
              }
            }

            // Update particles
            const damp = cfg.drag > 0 ? Math.pow(1 - cfg.drag, dt * 60) : 1;
            for (let i = particles.length - 1; i >= 0; i--) {
              const p = particles[i];
              p.age += dt;
              if (p.age >= p.life) {
                particles[i] = particles[particles.length - 1];
                particles.pop();
                continue;
              }

              if (cfg.turbulence > 0) {
                p.vx += (Math.random() - 0.5) * cfg.turbulence * dt * 2;
                p.vy += (Math.random() - 0.5) * cfg.turbulence * dt * 2;
              }

              p.vx += cfg.gravityX * dt;
              p.vy += cfg.gravityY * dt;
              p.vx *= damp;
              p.vy *= damp;
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.rotation += p.rotSpeed * dt;
            }
          }

          if (shakeRef.current > 0) {
            shakeRef.current = Math.max(0, shakeRef.current - dt * 32);
          }
        }

        // Clear canvas (transparent so parent CSS background / checkerboard shows cleanly)
        ctx.clearRect(0, 0, width, height);

        ctx.save();
        if (shakeRef.current > 0.2) {
          const sx = (Math.random() - 0.5) * shakeRef.current;
          const sy = (Math.random() - 0.5) * shakeRef.current;
          ctx.translate(sx, sy);
        }

        // Subtle emitter crosshair / guide in center or cursor mode
        if (mode !== 'playtest') {
          const gx =
            mode === 'center' || !emitterPosRef.current.hasPointer
              ? width / 2
              : emitterPosRef.current.x;
          const gy =
            mode === 'center' || !emitterPosRef.current.hasPointer
              ? height / 2
              : emitterPosRef.current.y;

          const guideColor =
            bgRef.current === 'light' ? 'rgba(15, 23, 42, 0.16)' : 'rgba(248, 250, 252, 0.14)';
          ctx.strokeStyle = guideColor;
          ctx.lineWidth = 1;

          if (cfg.emitterShape === 'circle' || cfg.emitterShape === 'ring') {
            ctx.beginPath();
            ctx.setLineDash([4, 4]);
            ctx.arc(gx, gy, cfg.emitterRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (cfg.emitterShape === 'line') {
            ctx.beginPath();
            ctx.setLineDash([4, 4]);
            ctx.moveTo(gx - cfg.emitterRadius, gy);
            ctx.lineTo(gx + cfg.emitterRadius, gy);
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (cfg.emitterShape === 'box') {
            ctx.beginPath();
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(
              gx - cfg.emitterRadius,
              gy - cfg.emitterRadius,
              cfg.emitterRadius * 2,
              cfg.emitterRadius * 2
            );
            ctx.setLineDash([]);
          } else {
            ctx.beginPath();
            ctx.moveTo(gx - 6, gy);
            ctx.lineTo(gx + 6, gy);
            ctx.moveTo(gx, gy - 6);
            ctx.lineTo(gx, gy + 6);
            ctx.stroke();
          }
        }

        // Draw playtest targets
        if (mode === 'playtest') {
          const isLight = bgRef.current === 'light';
          for (const t of targetsRef.current) {
            const pulse = 1 + Math.sin(t.phase) * 0.05;
            const r = t.radius * pulse;

            ctx.save();
            ctx.translate(t.x, t.y);

            // Outer ring
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle =
              t.flash > 0
                ? 'rgba(255, 255, 255, 0.9)'
                : isLight
                  ? 'rgba(15, 23, 42, 0.08)'
                  : 'rgba(245, 158, 11, 0.14)';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = t.flash > 0 ? '#FFFFFF' : '#F59E0B';
            ctx.stroke();

            // Inner bullseye
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = t.flash > 0 ? '#F59E0B' : '#F59E0B';
            ctx.fill();

            ctx.restore();
          }
        }

        // Draw particles
        const startRgb = hexToRgb(cfg.colorStart);
        const midRgb = hexToRgb(cfg.colorMid);
        const endRgb = hexToRgb(cfg.colorEnd);

        ctx.save();
        ctx.globalCompositeOperation = cfg.blendMode;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const t = Math.min(1, p.age / p.life);
          const size = p.sizeStart + (p.sizeEnd - p.sizeStart) * t;
          const alpha = Math.max(
            0,
            Math.min(1, cfg.opacityStart + (cfg.opacityEnd - cfg.opacityStart) * t)
          );
          if (alpha <= 0.005 || size <= 0.05) continue;

          let r: number;
          let g: number;
          let b: number;

          if (cfg.colorMode === 'palette') {
            [r, g, b] = p.color;
          } else if (t < 0.5) {
            const k = t * 2;
            r = (startRgb[0] + (midRgb[0] - startRgb[0]) * k) | 0;
            g = (startRgb[1] + (midRgb[1] - startRgb[1]) * k) | 0;
            b = (startRgb[2] + (midRgb[2] - startRgb[2]) * k) | 0;
          } else {
            const k = (t - 0.5) * 2;
            r = (midRgb[0] + (endRgb[0] - midRgb[0]) * k) | 0;
            g = (midRgb[1] + (endRgb[1] - midRgb[1]) * k) | 0;
            b = (midRgb[2] + (endRgb[2] - midRgb[2]) * k) | 0;
          }

          const colorStr = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;

          ctx.save();
          ctx.translate(p.x, p.y);

          if (cfg.shape === 'square') {
            ctx.rotate(p.rotation);
            ctx.fillStyle = colorStr;
            ctx.fillRect(-size, -size, size * 2, size * 2);
          } else if (cfg.shape === 'spark') {
            const angle = Math.atan2(p.vy, p.vx);
            const speed = Math.hypot(p.vx, p.vy);
            const len = Math.max(size * 2, speed * 0.045);
            ctx.rotate(angle);
            ctx.strokeStyle = colorStr;
            ctx.lineWidth = Math.max(1, size);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-len, 0);
            ctx.lineTo(len * 0.35, 0);
            ctx.stroke();
          } else if (cfg.shape === 'ring') {
            ctx.strokeStyle = colorStr;
            ctx.lineWidth = Math.max(1.5, size * 0.22);
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI * 2);
            ctx.stroke();
          } else if (cfg.shape === 'triangle') {
            ctx.rotate(p.rotation);
            ctx.fillStyle = colorStr;
            const rad = size * 1.25;
            ctx.beginPath();
            for (let k = 0; k < 3; k++) {
              const a = (k * Math.PI * 2) / 3 - Math.PI / 2;
              const px = Math.cos(a) * rad;
              const py = Math.sin(a) * rad;
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
          } else if (cfg.shape === 'star') {
            ctx.rotate(p.rotation);
            ctx.fillStyle = colorStr;
            const outer = size * 1.35;
            const inner = size * 0.55;
            ctx.beginPath();
            for (let k = 0; k < 8; k++) {
              const rad = k % 2 === 0 ? outer : inner;
              const a = (k * Math.PI) / 4 - Math.PI / 2;
              const px = Math.cos(a) * rad;
              const py = Math.sin(a) * rad;
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillStyle = colorStr;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
        ctx.restore();

        // Draw floating hit score text
        for (const f of floatingScoresRef.current) {
          const alpha = Math.max(0, 1 - f.age / f.life);
          ctx.font = '600 13px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = `rgba(251, 191, 36, ${alpha.toFixed(2)})`;
          ctx.fillText(f.text, f.x, f.y);
        }

        ctx.restore();

        statsTimer += dt;
        if (statsTimer >= 0.25) {
          statsTimer = 0;
          setStats({ count: particles.length, fps: currentFps });
        }

        rafId = requestAnimationFrame(frame);
      };

      rafId = requestAnimationFrame(frame);

      return () => {
        cancelAnimationFrame(rafId);
        observer.disconnect();
      };
    }, []);

    const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const pt = getCanvasPoint(e);
      emitterPosRef.current.x = pt.x;
      emitterPosRef.current.y = pt.y;
      emitterPosRef.current.hasPointer = true;
      emitterPosRef.current.pointerDown = true;

      if (interactionMode === 'playtest') {
        let hit = false;
        const { width, height } = viewportRef.current;
        const pad = 54;
        for (const target of targetsRef.current) {
          const dist = Math.hypot(pt.x - target.x, pt.y - target.y);
          if (dist <= target.radius + 10) {
            hit = true;
            emitBurstAt(target.x, target.y, Math.max(20, configRef.current.burstCount));
            target.flash = 1;
            // Relocate target smoothly to a new spot
            target.x = pad + Math.random() * Math.max(40, width - pad * 2);
            target.y = pad + 36 + Math.random() * Math.max(40, height - pad * 2 - 36);
            const a = Math.random() * Math.PI * 2;
            const spd = 65 + Math.random() * 85;
            target.vx = Math.cos(a) * spd;
            target.vy = Math.sin(a) * spd;

            comboRef.current.combo += 1;
            comboRef.current.timer = 2.2;
            const pts = 100 * comboRef.current.combo;
            comboRef.current.score += pts;
            setArenaStats({ score: comboRef.current.score, combo: comboRef.current.combo });

            floatingScoresRef.current.push({
              x: pt.x,
              y: pt.y - 12,
              text: comboRef.current.combo > 1 ? `+${pts} ×${comboRef.current.combo}` : `+${pts}`,
              age: 0,
              life: 0.75,
            });

            hitstopRef.current = 0.04;
            shakeRef.current = 8;
            soundEngine.playTargetHit(comboRef.current.combo);
            break;
          }
        }
        if (!hit) {
          // Missed shot still emits a small feedback spark at click point
          emitBurstAt(pt.x, pt.y, Math.min(14, configRef.current.burstCount));
          comboRef.current.combo = 0;
          setArenaStats({ score: comboRef.current.score, combo: 0 });
        }
        return;
      }

      // Standard Studio Burst on Click
      emitBurstAt(pt.x, pt.y);
      soundEngine.playBurst();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const pt = getCanvasPoint(e);
      emitterPosRef.current.x = pt.x;
      emitterPosRef.current.y = pt.y;
      emitterPosRef.current.hasPointer = true;
    };

    const handlePointerUp = () => {
      emitterPosRef.current.pointerDown = false;
    };

    const handlePointerLeave = () => {
      emitterPosRef.current.pointerDown = false;
      if (interactionMode === 'cursor') {
        emitterPosRef.current.hasPointer = false;
      }
    };

    const togglePlay = () => {
      const next = !isPlaying;
      isPlayingRef.current = next;
      setIsPlaying(next);
    };

    const toggleMute = () => {
      const next = !muted;
      soundEngine.muted = next;
      setMuted(next);
    };

    const isLightBg = background === 'light';

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden select-none ${BG_STYLES[background].className}`}
      >
        {/* Isolated 60fps Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="block w-full h-full cursor-crosshair touch-none"
        />

        {/* Top-left Mode Segmented Switcher (opaque surface, no backdrop-filter over canvas) */}
        <div className="pointer-events-none absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
          <div className="pointer-events-auto inline-flex items-center gap-0.5 p-1 rounded-lg bg-[#121722] border border-white/10 shadow-md">
            {(
              [
                { id: 'cursor', label: 'Follow', icon: MousePointer },
                { id: 'center', label: 'Center', icon: Crosshair },
                { id: 'drag', label: 'Draw', icon: Move },
                { id: 'playtest', label: 'Target Arena', icon: TargetIcon },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const active = interactionMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onInteractionModeChange(id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Top-right Canvas Utilities */}
          <div className="pointer-events-auto inline-flex items-center gap-1.5 p-1 rounded-lg bg-[#121722] border border-white/10 shadow-md">
            <button
              type="button"
              onClick={() => {
                const { width, height } = viewportRef.current;
                emitBurstAt(width / 2, height / 2);
                soundEngine.playBurst();
              }}
              title="Trigger Burst"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-amber-300 hover:bg-amber-500/15 transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Burst</span>
            </button>

            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? 'Pause simulation' : 'Resume simulation'}
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              aria-label={isPlaying ? 'Pause simulation' : 'Resume simulation'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                particlesRef.current.length = 0;
              }}
              title="Clear particles"
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Clear particles"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={toggleMute}
              title={muted ? 'Unmute sound effects' : 'Mute sound effects'}
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <div className="h-4 w-px bg-white/10 mx-0.5" />

            {/* Background Swatch Picker */}
            <div className="flex items-center gap-1 pr-1" role="group" aria-label="Canvas background">
              {(Object.keys(BG_STYLES) as CanvasBackground[]).map((bgKey) => {
                const item = BG_STYLES[bgKey];
                const selected = background === bgKey;
                return (
                  <button
                    key={bgKey}
                    type="button"
                    onClick={() => onBackgroundChange(bgKey)}
                    title={`Background: ${item.label}`}
                    className={`w-5 h-5 rounded border transition-transform ${
                      selected
                        ? 'border-amber-400 scale-110'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                    style={{
                      backgroundColor: item.swatch,
                      backgroundImage:
                        bgKey === 'checker'
                          ? 'linear-gradient(45deg, #475569 25%, transparent 25%), linear-gradient(-45deg, #475569 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #475569 75%), linear-gradient(-45deg, transparent 75%, #475569 75%)'
                          : undefined,
                      backgroundSize: bgKey === 'checker' ? '8px 8px' : undefined,
                      backgroundPosition: bgKey === 'checker' ? '0 0, 0 4px, 4px -4px, -4px 0' : undefined,
                    }}
                    aria-label={`Set canvas background to ${item.label}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Playtest Arena Score Readout (unboxed tabular-nums text) */}
        {interactionMode === 'playtest' && (
          <div
            className={`pointer-events-none absolute bottom-3 right-3 text-right font-mono text-xs tabular-nums ${
              isLightBg ? 'text-slate-700' : 'text-slate-300'
            }`}
          >
            <div className="font-semibold text-amber-400">
              Score {arenaStats.score}
              {arenaStats.combo > 1 ? ` · Combo ×${arenaStats.combo}` : ''}
            </div>
            <div className={isLightBg ? 'text-slate-500' : 'text-slate-400'}>
              Click targets to test impact particles
            </div>
          </div>
        )}

        {/* Bottom-left Live Readout (clean unboxed text with dot separator) */}
        <div
          className={`pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 font-mono text-xs tabular-nums ${
            isLightBg ? 'text-slate-600' : 'text-slate-400'
          }`}
        >
          <span>{stats.count} particles</span>
          <span aria-hidden="true">·</span>
          <span>{stats.fps} fps</span>
          <span aria-hidden="true">·</span>
          <span>
            {interactionMode === 'playtest'
              ? 'Click targets'
              : config.emissionMode === 'burst'
                ? 'Click anywhere to burst'
                : interactionMode === 'drag'
                  ? 'Drag to emit'
                  : 'Move cursor or click'}
          </span>
        </div>
      </div>
    );
  }
);
