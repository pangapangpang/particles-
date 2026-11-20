import { CanvasBackground, CodeOutputFormat, ParticleConfig } from '../types/particle';

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

function getBgColorForDemo(bg: CanvasBackground): string {
  switch (bg) {
    case 'light':
      return '#F8FAFC';
    case 'slate':
      return '#1E293B';
    case 'checker':
      return '#161B26';
    case 'obsidian':
    default:
      return '#0B0E14';
  }
}

function buildConfigBlock(config: ParticleConfig): string {
  const startRgb = hexToRgb(config.colorStart);
  const midRgb = hexToRgb(config.colorMid);
  const endRgb = hexToRgb(config.colorEnd);
  const paletteRgb = config.palette.map(hexToRgb);

  return `{
  emitterShape: '${config.emitterShape}',
  emitterRadius: ${config.emitterRadius},
  emissionMode: '${config.emissionMode}',
  rate: ${config.rate},
  burstCount: ${config.burstCount},
  angle: ${config.angle},
  spread: ${config.spread},
  speedMin: ${config.speedMin},
  speedMax: ${config.speedMax},
  lifeMin: ${config.lifeMin},
  lifeMax: ${config.lifeMax},
  sizeStart: ${config.sizeStart},
  sizeEnd: ${config.sizeEnd},
  sizeVariance: ${config.sizeVariance},
  opacityStart: ${config.opacityStart},
  opacityEnd: ${config.opacityEnd},
  gravityX: ${config.gravityX},
  gravityY: ${config.gravityY},
  drag: ${config.drag},
  turbulence: ${config.turbulence},
  rotationSpeed: ${config.rotationSpeed},
  shape: '${config.shape}',
  blendMode: '${config.blendMode}',
  colorMode: '${config.colorMode}',
  colorStart: [${startRgb.join(', ')}],
  colorMid: [${midRgb.join(', ')}],
  colorEnd: [${endRgb.join(', ')}],
  palette: ${JSON.stringify(paletteRgb)},
  maxParticles: 1500
}`;
}

function buildShapeDrawSnippet(shape: ParticleConfig['shape']): string {
  switch (shape) {
    case 'square':
      return `      ctx.rotate(p.rotation);
      ctx.fillStyle = color;
      ctx.fillRect(-size, -size, size * 2, size * 2);`;
    case 'spark':
      return `      const angle = Math.atan2(p.vy, p.vx);
      const speed = Math.hypot(p.vx, p.vy);
      const length = Math.max(size * 2, speed * 0.045);
      ctx.rotate(angle);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, size);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-length, 0);
      ctx.lineTo(length * 0.35, 0);
      ctx.stroke();`;
    case 'ring':
      return `      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, size * 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.stroke();`;
    case 'triangle':
      return `      ctx.rotate(p.rotation);
      ctx.fillStyle = color;
      const r = size * 1.25;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();`;
    case 'star':
      return `      ctx.rotate(p.rotation);
      ctx.fillStyle = color;
      const outer = size * 1.35;
      const inner = size * 0.55;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rad = i % 2 === 0 ? outer : inner;
        const a = (i * Math.PI) / 4 - Math.PI / 2;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();`;
    case 'circle':
    default:
      return `      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();`;
  }
}

function buildSpawnPositionSnippet(emitterShape: ParticleConfig['emitterShape']): string {
  switch (emitterShape) {
    case 'circle':
      return `    const r = cfg.emitterRadius * Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    const x = ox + Math.cos(a) * r;
    const y = oy + Math.sin(a) * r;`;
    case 'ring':
      return `    const a = Math.random() * Math.PI * 2;
    const x = ox + Math.cos(a) * cfg.emitterRadius;
    const y = oy + Math.sin(a) * cfg.emitterRadius;`;
    case 'line':
      return `    const x = ox + (Math.random() - 0.5) * cfg.emitterRadius * 2;
    const y = oy;`;
    case 'box':
      return `    const x = ox + (Math.random() - 0.5) * cfg.emitterRadius * 2;
    const y = oy + (Math.random() - 0.5) * cfg.emitterRadius * 2;`;
    case 'point':
    default:
      return `    const x = ox;
    const y = oy;`;
  }
}

export function generateJavaScriptCode(
  config: ParticleConfig,
  format: CodeOutputFormat,
  includeDemoLoop: boolean,
  canvasBackground: CanvasBackground,
  compact = false
): string {
  const cfgText = buildConfigBlock(config);
  const spawnPos = buildSpawnPositionSnippet(config.emitterShape);
  const drawShape = buildShapeDrawSnippet(config.shape);
  const bgHex = getBgColorForDemo(canvasBackground);

  const colorLogic =
    config.colorMode === 'palette'
      ? `      const c = p.color;`
      : `      let r, g, b;
      if (t < 0.5) {
        const k = t * 2;
        r = (cfg.colorStart[0] + (cfg.colorMid[0] - cfg.colorStart[0]) * k) | 0;
        g = (cfg.colorStart[1] + (cfg.colorMid[1] - cfg.colorStart[1]) * k) | 0;
        b = (cfg.colorStart[2] + (cfg.colorMid[2] - cfg.colorStart[2]) * k) | 0;
      } else {
        const k = (t - 0.5) * 2;
        r = (cfg.colorMid[0] + (cfg.colorEnd[0] - cfg.colorMid[0]) * k) | 0;
        g = (cfg.colorMid[1] + (cfg.colorEnd[1] - cfg.colorMid[1]) * k) | 0;
        b = (cfg.colorMid[2] + (cfg.colorEnd[2] - cfg.colorMid[2]) * k) | 0;
      }
      const c = [r, g, b];`;

  const palettePropOnSpawn =
    config.colorMode === 'palette'
      ? `\n      color: cfg.palette[(Math.random() * cfg.palette.length) | 0],`
      : '';

  if (format === 'function') {
    const demoCode = includeDemoLoop
      ? `

// Usage Example: Attach to a <canvas id="particles"></canvas>
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
const system = createParticleSystem(canvas.width / 2, canvas.height / 2);

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  system.setPosition(e.clientX - rect.left, e.clientY - rect.top);
});
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  system.burst(e.clientX - rect.left, e.clientY - rect.top);
});

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  ctx.fillStyle = '${bgHex}';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  system.update(dt);
  system.draw(ctx);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);`
      : '';

    const raw = `const PARTICLE_CONFIG = ${cfgText};

function createParticleSystem(x = 0, y = 0, overrides = {}) {
  const cfg = { ...PARTICLE_CONFIG, ...overrides };
  const particles = [];
  let originX = x;
  let originY = y;
  let emitAccumulator = 0;

  const rand = (min, max) => min + Math.random() * (max - min);
  const lerp = (a, b, t) => a + (b - a) * t;

  function spawn(ox = originX, oy = originY) {
    if (particles.length >= cfg.maxParticles) return;
${spawnPos}
    const baseAngle = (cfg.angle * Math.PI) / 180;
    const spreadRad = (cfg.spread * Math.PI) / 180;
    const theta = baseAngle + (Math.random() - 0.5) * spreadRad;
    const speed = rand(cfg.speedMin, cfg.speedMax);
    const scale = 1 + (Math.random() * 2 - 1) * cfg.sizeVariance;

    particles.push({
      x,
      y,
      vx: Math.cos(theta) * speed,
      vy: Math.sin(theta) * speed,
      age: 0,
      life: rand(cfg.lifeMin, cfg.lifeMax),
      sizeStart: Math.max(0.5, cfg.sizeStart * scale),
      sizeEnd: Math.max(0, cfg.sizeEnd * scale),
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: ((Math.random() < 0.5 ? -1 : 1) * cfg.rotationSpeed * Math.PI) / 180,${palettePropOnSpawn}
    });
  }

  function burst(ox = originX, oy = originY, count = cfg.burstCount) {
    for (let i = 0; i < count; i++) spawn(ox, oy);
  }

  function update(dt) {
    const step = Math.min(dt, 0.05);

    if (cfg.emissionMode === 'continuous') {
      emitAccumulator += cfg.rate * step;
      while (emitAccumulator >= 1) {
        spawn(originX, originY);
        emitAccumulator -= 1;
      }
    }

    const damp = cfg.drag > 0 ? Math.pow(1 - cfg.drag, step * 60) : 1;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += step;
      if (p.age >= p.life) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
        continue;
      }

      if (cfg.turbulence > 0) {
        p.vx += (Math.random() - 0.5) * cfg.turbulence * step * 2;
        p.vy += (Math.random() - 0.5) * cfg.turbulence * step * 2;
      }
      p.vx += cfg.gravityX * step;
      p.vy += cfg.gravityY * step;
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.rotation += p.rotSpeed * step;
    }
  }

  function draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = cfg.blendMode;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const t = Math.min(1, p.age / p.life);
      const size = lerp(p.sizeStart, p.sizeEnd, t);
      const alpha = Math.max(0, Math.min(1, lerp(cfg.opacityStart, cfg.opacityEnd, t)));
      if (alpha <= 0.005 || size <= 0.05) continue;

${colorLogic}
      const color = \`rgba(\${c[0]}, \${c[1]}, \${c[2]}, \${alpha.toFixed(3)})\`;

      ctx.save();
      ctx.translate(p.x, p.y);
${drawShape}
      ctx.restore();
    }

    ctx.restore();
  }

  return {
    spawn,
    burst,
    update,
    draw,
    setPosition(nx, ny) {
      originX = nx;
      originY = ny;
    },
    clear() {
      particles.length = 0;
    },
    getCount() {
      return particles.length;
    },
  };
}${demoCode}`;

    return compact ? compactCode(raw) : raw;
  }

  // Class implementation (shared by 'class' and 'html')
  const classImpl = `class ParticleEmitter {
  constructor(x = 0, y = 0, config = {}) {
    this.x = x;
    this.y = y;
    this.particles = [];
    this.emitAccumulator = 0;
    this.cfg = {
      ...${cfgText.replace(/\n/g, '\n      ')},
      ...config,
    };
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  spawn(ox = this.x, oy = this.y) {
    const cfg = this.cfg;
    if (this.particles.length >= cfg.maxParticles) return;

${spawnPos}
    const baseAngle = (cfg.angle * Math.PI) / 180;
    const spreadRad = (cfg.spread * Math.PI) / 180;
    const theta = baseAngle + (Math.random() - 0.5) * spreadRad;
    const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    const scale = 1 + (Math.random() * 2 - 1) * cfg.sizeVariance;

    this.particles.push({
      x,
      y,
      vx: Math.cos(theta) * speed,
      vy: Math.sin(theta) * speed,
      age: 0,
      life: cfg.lifeMin + Math.random() * (cfg.lifeMax - cfg.lifeMin),
      sizeStart: Math.max(0.5, cfg.sizeStart * scale),
      sizeEnd: Math.max(0, cfg.sizeEnd * scale),
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: ((Math.random() < 0.5 ? -1 : 1) * cfg.rotationSpeed * Math.PI) / 180,${palettePropOnSpawn}
    });
  }

  burst(ox = this.x, oy = this.y, count = this.cfg.burstCount) {
    for (let i = 0; i < count; i++) {
      this.spawn(ox, oy);
    }
  }

  update(dt) {
    const cfg = this.cfg;
    const step = Math.min(dt, 0.05);

    if (cfg.emissionMode === 'continuous') {
      this.emitAccumulator += cfg.rate * step;
      while (this.emitAccumulator >= 1) {
        this.spawn(this.x, this.y);
        this.emitAccumulator -= 1;
      }
    }

    const damp = cfg.drag > 0 ? Math.pow(1 - cfg.drag, step * 60) : 1;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += step;
      if (p.age >= p.life) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }

      if (cfg.turbulence > 0) {
        p.vx += (Math.random() - 0.5) * cfg.turbulence * step * 2;
        p.vy += (Math.random() - 0.5) * cfg.turbulence * step * 2;
      }

      p.vx += cfg.gravityX * step;
      p.vy += cfg.gravityY * step;
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.rotation += p.rotSpeed * step;
    }
  }

  draw(ctx) {
    const cfg = this.cfg;
    ctx.save();
    ctx.globalCompositeOperation = cfg.blendMode;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const t = Math.min(1, p.age / p.life);
      const size = p.sizeStart + (p.sizeEnd - p.sizeStart) * t;
      const alpha = Math.max(0, Math.min(1, cfg.opacityStart + (cfg.opacityEnd - cfg.opacityStart) * t));
      if (alpha <= 0.005 || size <= 0.05) continue;

${colorLogic}
      const color = \`rgba(\${c[0]}, \${c[1]}, \${c[2]}, \${alpha.toFixed(3)})\`;

      ctx.save();
      ctx.translate(p.x, p.y);
${drawShape}
      ctx.restore();
    }

    ctx.restore();
  }
}`;

  if (format === 'html') {
    const initialBurst =
      config.emissionMode === 'burst'
        ? `\nemitter.burst(window.innerWidth / 2, window.innerHeight / 2);`
        : '';

    const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Particle Effect Preview</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: ${bgHex}; }
    canvas { display: block; width: 100%; height: 100%; cursor: crosshair; }
  </style>
</head>
<body>
  <canvas id="particle-canvas"></canvas>
  <script>
${classImpl
  .split('\n')
  .map((line) => '  ' + line)
  .join('\n')}

  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  const emitter = new ParticleEmitter(window.innerWidth / 2, window.innerHeight / 2);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();${initialBurst}

  canvas.addEventListener('pointermove', (e) => {
    emitter.setPosition(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerdown', (e) => {
    emitter.setPosition(e.clientX, e.clientY);
    emitter.burst(e.clientX, e.clientY);
  });

  let lastTime = performance.now();
  function animate(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    ctx.fillStyle = '${bgHex}';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    emitter.update(dt);
    emitter.draw(ctx);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  </script>
</body>
</html>`;

    return compact ? compactCode(htmlCode) : htmlCode;
  }

  // format === 'class'
  const demoLoop = includeDemoLoop
    ? `

// Usage Example
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const emitter = new ParticleEmitter(canvas.width / 2, canvas.height / 2);

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  emitter.setPosition(e.clientX - rect.left, e.clientY - rect.top);
});
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  emitter.burst(e.clientX - rect.left, e.clientY - rect.top);
});

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  ctx.fillStyle = '${bgHex}';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  emitter.update(dt);
  emitter.draw(ctx);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);`
    : '';

  const fullClass = `${classImpl}${demoLoop}`;
  return compact ? compactCode(fullClass) : fullClass;
}

function compactCode(src: string): string {
  return src
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'))
    .join('\n');
}
