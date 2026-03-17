'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BrewBeatsScrollProps {
  onEnterApp: () => void;
}

// ═══════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════
const SLIDE_NAMES = [
  'Welcome', 'The Problem', 'Our Purpose', 'How It Works',
  'User Journey', 'AI Engine', 'Visual Tools', 'Features',
  'AI Architecture', 'Benefits', 'Tech Stack', 'Instruments', 'Launch', 'Conclusion',
];
const TOTAL = SLIDE_NAMES.length;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ═══════════════════════════════════════════════
//  ANIMATION VARIANTS
// ═══════════════════════════════════════════════
const slideVariants = {
  enter: (d: number) => ({
    y: d > 0 ? '120%' : '-120%',
    opacity: 0,
    scale: 0.6,
    rotateX: d > 0 ? 35 : -35,
    rotateY: d > 0 ? -15 : 15,
    filter: 'blur(24px) brightness(0.3)',
  }),
  center: {
    y: 0, opacity: 1, scale: 1, rotateX: 0, rotateY: 0, filter: 'blur(0px) brightness(1)',
    transition: { duration: 0.9, ease: EASE },
  },
  exit: (d: number) => ({
    y: d > 0 ? '-100%' : '100%',
    opacity: 0, scale: 0.7,
    rotateX: d > 0 ? -25 : 25,
    rotateY: d > 0 ? 10 : -10,
    filter: 'blur(18px) brightness(0.5)',
    transition: { duration: 0.6, ease: EASE },
  }),
};

const stagger = { animate: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } };
const fadeUp = {
  initial: { opacity: 0, y: 120, scale: 0.8, filter: 'blur(12px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease: EASE } },
};
const fadeLeft = {
  initial: { opacity: 0, x: -120, rotateY: 25, filter: 'blur(10px)' },
  animate: { opacity: 1, x: 0, rotateY: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: EASE } },
};
const fadeRight = {
  initial: { opacity: 0, x: 120, rotateY: -25, filter: 'blur(10px)' },
  animate: { opacity: 1, x: 0, rotateY: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: EASE } },
};
const scaleIn = {
  initial: { opacity: 0, scale: 0.2, rotate: -30, filter: 'blur(15px)' },
  animate: { opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 180, damping: 12 } },
};
const popIn = {
  initial: { opacity: 0, scale: 0, rotate: -360, filter: 'blur(20px)' },
  animate: { opacity: 1, scale: 1, rotate: 0, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 200, damping: 14 } },
};

// ═══════════════════════════════════════════════
//  ANTIGRAVITY BACKGROUND — FULL SYSTEM
//  Spinning radial, floating music elements
//  (beans, EQ boxes, waveforms, notes),
//  connection mesh, sparks
// ═══════════════════════════════════════════════
interface FloatingElement {
  x: number; y: number; vx: number; vy: number;
  size: number; rotation: number; vr: number;
  opacity: number; phase: number;
  type: 'bean' | 'note-box' | 'eq-box' | 'wave-box';
  colorIdx: number;
}
interface Spark {
  x: number; y: number; vx: number; vy: number;
  size: number; opacity: number; life: number; maxLife: number; hue: number;
}

const EL_COLORS = ['#c8956c', '#9b6b8a', '#e8b88a', '#b08898', '#d4a574', '#e8c5a0'];
const BEAN_PALS = [
  { body: '#5a3a22', dark: '#2a1a0e', light: '#9a7050' },
  { body: '#4a2e18', dark: '#1e1008', light: '#7a5535' },
  { body: '#6b4a30', dark: '#3a2010', light: '#b08860' },
  { body: '#8b6345', dark: '#5a3a22', light: '#c89870' },
];

// ── Drawing helpers ──
function drawBeanShape(ctx: CanvasRenderingContext2D, s: number, palIdx: number) {
  const pal = BEAN_PALS[palIdx % BEAN_PALS.length];
  const hw = s * 0.45, hh = s * 0.7;
  const grad = ctx.createRadialGradient(-hw * 0.25, -hh * 0.2, 0, 0, 0, Math.max(hw, hh));
  grad.addColorStop(0, pal.light); grad.addColorStop(0.4, pal.body); grad.addColorStop(1, pal.dark);
  ctx.beginPath(); ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -hh * 0.82);
  ctx.bezierCurveTo(hw * 0.28, -hh * 0.15, -hw * 0.28, hh * 0.15, 0, hh * 0.82);
  ctx.strokeStyle = 'rgba(10,6,4,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-hw * 0.22, -hh * 0.28, hw * 0.18, hh * 0.12, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,240,220,0.12)'; ctx.fill();
}

function drawBoxBG(ctx: CanvasRenderingContext2D, s: number, color: string) {
  const w = s * 1.6, h = s * 1.2, r = s * 0.2;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + r, -h / 2);
  ctx.lineTo(w / 2 - r, -h / 2); ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  ctx.lineTo(w / 2, h / 2 - r); ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  ctx.lineTo(-w / 2 + r, h / 2); ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  ctx.lineTo(-w / 2, -h / 2 + r); ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(42,33,24,0.55)'; ctx.fill();
  ctx.strokeStyle = color + '44'; ctx.lineWidth = 0.8; ctx.stroke();
}

function drawNoteEl(ctx: CanvasRenderingContext2D, s: number, color: string) {
  drawBoxBG(ctx, s, color);
  ctx.beginPath(); ctx.ellipse(-s * 0.15, s * 0.15, s * 0.2, s * 0.14, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.02, s * 0.15); ctx.lineTo(-s * 0.02, -s * 0.35);
  ctx.lineWidth = s * 0.06; ctx.strokeStyle = color; ctx.stroke();
}

function drawEqEl(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number) {
  drawBoxBG(ctx, s, color);
  for (let i = 0; i < 5; i++) {
    const bx = -s * 0.4 + i * s * 0.2;
    const bh = s * 0.25 + Math.sin(phase + i * 1.3) * s * 0.2;
    ctx.fillStyle = color; ctx.fillRect(bx, s * 0.3 - bh, s * 0.1, bh);
  }
}

function drawWaveEl(ctx: CanvasRenderingContext2D, s: number, color: string, phase: number) {
  drawBoxBG(ctx, s, color);
  const w = s * 1.6;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const px = -w / 2 + s * 0.2 + (i / 20) * (w - s * 0.4);
    const py = Math.sin(phase + i * 0.6) * s * 0.2;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = color; ctx.lineWidth = s * 0.05; ctx.stroke();
}

function drawSpinningRadial(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const cx = W / 2, cy = H / 2, maxR = Math.max(W, H) * 0.55;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.04);
  // Radial rays
  const N = 14;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const span = (0.35 / N) * Math.PI * 2;
    const ra = 0.012 + Math.sin(t * 0.4 + i * 0.9) * 0.006;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, maxR, a, a + span); ctx.closePath();
    ctx.fillStyle = `rgba(200,149,108,${ra})`; ctx.fill();
  }
  // Concentric pulsing rings
  for (let r = 0; r < 4; r++) {
    const radius = maxR * (0.15 + r * 0.2) + Math.sin(t * 0.25 + r * 1.5) * 15;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(232,192,108,${0.018 - r * 0.003})`; ctx.lineWidth = 1; ctx.stroke();
  }
  // Center glow
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR * 0.3);
  cg.addColorStop(0, 'rgba(232,192,108,0.03)'); cg.addColorStop(1, 'rgba(200,149,108,0)');
  ctx.beginPath(); ctx.arc(0, 0, maxR * 0.3, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill();
  ctx.restore();
}

function drawNeonMug(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const cx = W / 2, mugW = Math.min(W * 0.07, 90);
  const mugH = mugW * 1.35, mugY = H * 0.72, rimH = mugW * 0.18;
  ctx.save(); ctx.globalAlpha = 0.18;

  // Body
  const bodyG = ctx.createLinearGradient(cx - mugW, 0, cx + mugW, 0);
  bodyG.addColorStop(0, '#161010'); bodyG.addColorStop(0.25, '#28201a');
  bodyG.addColorStop(0.5, '#302820'); bodyG.addColorStop(0.75, '#28201a'); bodyG.addColorStop(1, '#161010');
  ctx.beginPath();
  ctx.moveTo(cx - mugW, mugY); ctx.lineTo(cx - mugW * 0.9, mugY + mugH);
  ctx.quadraticCurveTo(cx, mugY + mugH + mugW * 0.14, cx + mugW * 0.9, mugY + mugH);
  ctx.lineTo(cx + mugW, mugY); ctx.closePath();
  ctx.fillStyle = bodyG; ctx.fill();
  ctx.strokeStyle = 'rgba(200,149,108,0.3)'; ctx.lineWidth = 1.2; ctx.stroke();

  // Handle
  const hx = cx + mugW, ht = mugY + mugH * 0.18, hb = mugY + mugH * 0.68;
  ctx.beginPath(); ctx.moveTo(hx, ht);
  ctx.bezierCurveTo(hx + mugW * 0.42, ht, hx + mugW * 0.42, hb, hx, hb);
  ctx.strokeStyle = 'rgba(26,20,16,0.8)'; ctx.lineWidth = mugW * 0.11; ctx.stroke();
  ctx.strokeStyle = 'rgba(200,149,108,0.25)'; ctx.lineWidth = 1.2; ctx.stroke();

  // Rim
  ctx.beginPath(); ctx.ellipse(cx, mugY, mugW, rimH, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#2a1f16'; ctx.fill();
  ctx.strokeStyle = 'rgba(200,149,108,0.3)'; ctx.lineWidth = 1.2; ctx.stroke();

  // Coffee surface
  const cw = mugW * 0.86, ch = rimH * 0.72;
  const csg = ctx.createRadialGradient(cx, mugY, 0, cx, mugY, cw);
  csg.addColorStop(0, '#4a3525'); csg.addColorStop(0.5, '#3a2a1e'); csg.addColorStop(1, '#2a1e14');
  ctx.beginPath(); ctx.ellipse(cx, mugY, cw, ch, 0, 0, Math.PI * 2);
  ctx.fillStyle = csg; ctx.fill();

  // Latte swirl
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, mugY, cw * 0.9, ch * 0.9, 0, 0, Math.PI * 2); ctx.clip();
  const sq = ch / cw;
  for (let a = 0; a < 4; a++) {
    const base = (a / 4) * Math.PI * 2 + t * 0.45;
    ctx.beginPath();
    ctx.strokeStyle = `hsla(${30 + a * 3}, 50%, 65%, ${0.4 - a * 0.08})`;
    ctx.lineWidth = 1.8 - a * 0.2; ctx.lineCap = 'round';
    const sA = cw * 0.03;
    for (let j = 0; j <= 60; j++) {
      const f = j / 60, theta = f * Math.PI * 4, r = sA * Math.exp(0.2 * theta);
      const px = cx + Math.cos(theta + base) * r, py = mugY + Math.sin(theta + base) * r * sq;
      if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Steam wisps
  for (let i = 0; i < 4; i++) {
    const sx = cx + (i - 1.5) * 15;
    const prog = (t * 0.5 + i * 0.5) % 2.5;
    const sa = Math.sin((prog / 2.5) * Math.PI) * 0.12;
    if (sa < 0.01) continue;
    const sy = mugY - prog * 35;
    ctx.beginPath(); ctx.moveTo(sx, mugY);
    ctx.quadraticCurveTo(sx + Math.sin(t * 1.4 + i * 1.2) * 12, (mugY + sy) / 2, sx + Math.sin(t * 2 + i * 0.7) * 8, sy);
    ctx.strokeStyle = `rgba(245,230,208,${sa})`; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.stroke();
  }

  // Neon glow halo
  const mg = ctx.createRadialGradient(cx, mugY + mugH / 2, mugW * 0.5, cx, mugY + mugH / 2, mugW * 2.5);
  mg.addColorStop(0, 'rgba(200,149,108,0.04)'); mg.addColorStop(1, 'rgba(200,149,108,0)');
  ctx.globalAlpha = 0.3 + Math.sin(t * 0.5) * 0.05;
  ctx.beginPath(); ctx.arc(cx, mugY + mugH / 2, mugW * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = mg; ctx.fill();
  ctx.restore();
}

// ── Main background hook ──
function useAntigravityBG(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  mouseRef: React.RefObject<{ x: number; y: number }>,
) {
  const elementsRef = useRef<FloatingElement[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const rafRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize floating elements
    if (elementsRef.current.length === 0) {
      const types: FloatingElement['type'][] = ['bean', 'note-box', 'note-box', 'eq-box', 'wave-box', 'wave-box'];
      for (let i = 0; i < 32; i++) {
        const type = types[i % types.length];
        const isBean = type === 'bean';
        elementsRef.current.push({
          x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -(0.08 + Math.random() * 0.3) * (isBean ? 1.2 : 0.7),
          size: isBean ? 6 + Math.random() * 10 : 13 + Math.random() * 9,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * (isBean ? 0.008 : 0.003),
          opacity: isBean ? 0.18 + Math.random() * 0.18 : 0.12 + Math.random() * 0.12,
          phase: Math.random() * Math.PI * 2,
          type, colorIdx: Math.floor(Math.random() * EL_COLORS.length),
        });
      }
    }

    const draw = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      ctx.clearRect(0, 0, W, H);

      // 1. Spinning radial background
      drawSpinningRadial(ctx, W, H, t);

      const elems = elementsRef.current;
      const m = mouseRef.current;

      // 3. Connection mesh
      ctx.lineWidth = 0.4;
      for (let i = 0; i < elems.length; i++) {
        for (let j = i + 1; j < elems.length; j++) {
          const dx = elems[i].x - elems[j].x, dy = elems[i].y - elems[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 12100) {
            const d = Math.sqrt(d2);
            ctx.strokeStyle = `rgba(200,149,108,${0.04 * (1 - d / 110)})`;
            ctx.beginPath(); ctx.moveTo(elems[i].x, elems[i].y); ctx.lineTo(elems[j].x, elems[j].y); ctx.stroke();
          }
        }
      }

      // 4. Update & draw floating elements
      for (const el of elems) {
        if (m && m.x > 0) {
          const dx = el.x - m.x, dy = el.y - m.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 140 && d > 0) {
            const f = (140 - d) / 140 * 0.3;
            el.vx += (dx / d) * f; el.vy += (dy / d) * f;
          }
        }
        el.x += el.vx + Math.sin(t * 0.3 + el.phase) * 0.1;
        el.y += el.vy;
        el.rotation += el.vr;
        el.vx *= 0.995;
        el.vy = el.vy * 0.995 - 0.06; // antigravity float
        if (el.y < -60) { el.y = H + 60; el.x = Math.random() * W; }
        if (el.x < -60) el.x = W + 60;
        if (el.x > W + 60) el.x = -60;

        ctx.save();
        ctx.translate(el.x, el.y); ctx.rotate(el.rotation);
        ctx.globalAlpha = el.opacity + Math.sin(t * 0.8 + el.phase) * 0.03;
        const color = EL_COLORS[el.colorIdx];
        switch (el.type) {
          case 'bean': drawBeanShape(ctx, el.size, el.colorIdx); break;
          case 'note-box': drawNoteEl(ctx, el.size, color); break;
          case 'eq-box': drawEqEl(ctx, el.size, color, t * 2 + el.phase); break;
          case 'wave-box': drawWaveEl(ctx, el.size, color, t * 1.5 + el.phase); break;
        }
        ctx.restore();
      }

      // 5. Sparks near mug
      const sparks = sparksRef.current;
      if (Math.random() < 0.08) {
        sparks.push({
          x: W / 2 + (Math.random() - 0.5) * 100, y: H * 0.7 + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 1.2, vy: -(0.5 + Math.random() * 1),
          size: 0.5 + Math.random() * 1.5, opacity: 0.3 + Math.random() * 0.4,
          life: 0, maxLife: 40 + Math.random() * 60, hue: 22 + Math.random() * 28,
        });
        if (sparks.length > 40) sparks.splice(0, 10);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx; s.y += s.vy; s.vy -= 0.01; s.life++;
        if (s.life >= s.maxLife) { sparks.splice(i, 1); continue; }
        const a = s.opacity * Math.sin((s.life / s.maxLife) * Math.PI);
        if (a < 0.01) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = `hsl(${s.hue}, 70%, 72%)`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, mouseRef]);
}

// ═══════════════════════════════════════════════
//  INTERACTIVE COFFEE BEANS PHYSICS
// ═══════════════════════════════════════════════
interface Bean {
  x: number; y: number; vx: number; vy: number;
  r: number; angle: number; va: number; palIdx: number;
  dragging: boolean;
}

function useBeanPhysics(canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  const beansRef = useRef<Bean[]>([]);
  const rafRef = useRef(0);
  const preSpawnedRef = useRef(false);
  const dragRef = useRef<{ idx: number; lastX: number; lastY: number; lastT: number } | null>(null);

  // Platforms (curved rectangles)
  const platforms = useRef([
    { x: 0.1, y: 0.65, w: 0.25, h: 12 },
    { x: 0.65, y: 0.55, w: 0.22, h: 12 },
    { x: 0.35, y: 0.8, w: 0.3, h: 12 },
  ]).current;

  const spawn = useCallback((x: number, y: number) => {
    // Only spawn if NOT clicking/dragging an existing bean
    const r = 10 + Math.random() * 10;
    beansRef.current.push({
      x, y, vx: (Math.random() - 0.5) * 3, vy: -(2 + Math.random() * 4),
      r, angle: Math.random() * Math.PI * 2, va: (Math.random() - 0.5) * 0.12,
      palIdx: Math.floor(Math.random() * 4), dragging: false,
    });
    if (beansRef.current.length > 80) beansRef.current.splice(0, beansRef.current.length - 60);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Pre-spawn
    if (!preSpawnedRef.current && beansRef.current.length === 0) {
      preSpawnedRef.current = true;
      for (let i = 0; i < 15; i++) {
        beansRef.current.push({
          x: Math.random() * W, y: Math.random() * H * 0.5 + H * 0.2,
          vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
          r: 10 + Math.random() * 10, angle: Math.random() * Math.PI * 2,
          va: (Math.random() - 0.5) * 0.08, palIdx: Math.floor(Math.random() * 4), dragging: false,
        });
      }
    }

    // Drag handlers
    const findBean = (mx: number, my: number): number => {
      for (let i = beansRef.current.length - 1; i >= 0; i--) {
        const b = beansRef.current[i];
        const dx = b.x - mx, dy = b.y - my;
        if (dx * dx + dy * dy < (b.r + 15) * (b.r + 15)) return i;
      }
      return -1;
    };

    const onDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const idx = findBean(mx, my);
      if (idx >= 0) {
        canvas.setPointerCapture(e.pointerId);
        beansRef.current[idx].dragging = true;
        dragRef.current = { idx, lastX: mx, lastY: my, lastT: performance.now() };
        e.preventDefault();
      } else {
        // Only spawn if we didn't hit a bean
        spawn(mx, my);
      }
    };
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const b = beansRef.current[d.idx];
      if (!b) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      b.x = mx; b.y = my;
      const now = performance.now();
      const dt = Math.max(1, now - d.lastT);
      b.vx = (mx - d.lastX) / dt * 16;
      b.vy = (my - d.lastY) / dt * 16;
      d.lastX = mx; d.lastY = my; d.lastT = now;
    };
    const onUp = () => {
      if (dragRef.current) {
        const b = beansRef.current[dragRef.current.idx];
        if (b) b.dragging = false;
        dragRef.current = null;
      }
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const beans = beansRef.current;

      // Update text box bounds for collision
      const textBox = document.querySelector('.playground-text-box')?.getBoundingClientRect();
      const textRect = textBox ? {
        x: textBox.left, y: textBox.top, w: textBox.width, h: textBox.height
      } : null;

      // Draw platforms
      ctx.save();
      for (const p of platforms) {
        const px = p.x * W, py = p.y * H, pw = p.w * W, ph = p.h;
        ctx.beginPath();
        ctx.roundRect(px, py, pw, ph, ph / 2);
        
        // Inner fill
        ctx.fillStyle = 'rgba(200,149,108,0.25)';
        ctx.fill();
        
        // Outer glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(232, 192, 108, 0.5)';
        ctx.strokeStyle = 'rgba(232, 192, 108, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Secondary softer glow
        ctx.shadowBlur = 40;
        ctx.stroke();
      }
      ctx.restore();

      // Physics
      for (let i = 0; i < beans.length; i++) {
        const b = beans[i];
        if (b.dragging) { b.angle += b.va; continue; }

        b.vy += 0.35; // gravity
        b.vx *= 0.992; b.vy *= 0.992;
        b.x += b.vx; b.y += b.vy;
        b.angle += b.va;

        // Wall bounds
        if (b.x < b.r) { b.x = b.r; b.vx *= -0.5; }
        if (b.x > W - b.r) { b.x = W - b.r; b.vx *= -0.5; }
        if (b.y > H - b.r) { b.y = H - b.r; b.vy *= -0.5; b.va *= 0.9; }
        if (b.y < b.r) { b.y = b.r; b.vy *= -0.3; }

        // Platform collision
        for (const p of platforms) {
          const px = p.x * W, py = p.y * H, pw = p.w * W, ph = p.h;
          if (b.x + b.r > px && b.x - b.r < px + pw && b.y + b.r > py && b.y - b.r < py + ph) {
            if (b.vy > 0 && b.y < py + ph / 2) {
              b.y = py - b.r; b.vy *= -0.4; b.va *= 0.8;
            } else if (b.vy < 0) {
              b.y = py + ph + b.r; b.vy *= -0.3;
            }
          }
        }

        // Text box collision (reactive text)
        if (textRect) {
          if (b.x + b.r > textRect.x && b.x - b.r < textRect.x + textRect.w &&
              b.y + b.r > textRect.y && b.y - b.r < textRect.y + textRect.h) {
            if (b.vy > 0 && b.y < textRect.y + 20) {
              b.y = textRect.y - b.r; b.vy *= -0.5;
            } else {
              const dx = b.x - (textRect.x + textRect.w/2);
              b.vx = dx > 0 ? 5 : -5;
            }
          }
        }

        // Bean-to-bean collision
        for (let j = i + 1; j < beans.length; j++) {
          const o = beans[j];
          if (o.dragging) continue;
          const dx = o.x - b.x, dy = o.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = b.r + o.r;
          if (dist < minDist && dist > 0) {
            const nx = dx / dist, ny = dy / dist;
            const overlap = minDist - dist;
            b.x -= nx * overlap * 0.5; b.y -= ny * overlap * 0.5;
            o.x += nx * overlap * 0.5; o.y += ny * overlap * 0.5;
            const relVx = b.vx - o.vx, relVy = b.vy - o.vy;
            const impulse = (relVx * nx + relVy * ny) * 0.5;
            b.vx -= impulse * nx; b.vy -= impulse * ny;
            o.vx += impulse * nx; o.vy += impulse * ny;
            b.va += (Math.random() - 0.5) * 0.02;
            o.va += (Math.random() - 0.5) * 0.02;
          }
        }
      }

      // Draw beans using drawBeanShape
      for (const b of beans) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        drawBeanShape(ctx, b.r * 1.8, b.palIdx);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [active, canvasRef, platforms]);

  return spawn;
}

// ═══════════════════════════════════════════════
//  LARGE CANVAS DRAWING FUNCTIONS (per-slide)
// ═══════════════════════════════════════════════

/** Thin elegant coffee mug with swirling coffee and rising steam */
function drawSlideMug(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const scale = Math.min(W, H) / 900;
  const cx = W * 0.72;
  const cy = H * 0.55;

  ctx.save();
  ctx.translate(cx, cy);

  // ── Atmospheric glow behind mug ──
  const bgGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 320 * scale);
  bgGlow.addColorStop(0, 'rgba(200, 149, 108, 0.12)');
  bgGlow.addColorStop(0.4, 'rgba(122, 74, 107, 0.04)');
  bgGlow.addColorStop(1, 'rgba(26, 18, 16, 0)');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(-400 * scale, -400 * scale, 800 * scale, 800 * scale);

  // ── Mug dimensions (tall & thin) ──
  const mugW = 70 * scale;   // half-width
  const mugH = 180 * scale;  // total height
  const rimY = -mugH * 0.5;
  const baseY = mugH * 0.5;
  const taper = 0.85; // base is slightly narrower

  // ── Mug Body ──
  ctx.beginPath();
  ctx.moveTo(-mugW, rimY);
  // Left side — slight inward taper
  ctx.bezierCurveTo(-mugW, rimY + mugH * 0.4, -mugW * taper, baseY - 20 * scale, -mugW * taper, baseY);
  // Bottom curve
  ctx.quadraticCurveTo(0, baseY + 18 * scale, mugW * taper, baseY);
  // Right side
  ctx.bezierCurveTo(mugW * taper, baseY - 20 * scale, mugW, rimY + mugH * 0.4, mugW, rimY);

  // Interior gradient
  const bodyGrad = ctx.createLinearGradient(-mugW, rimY, mugW * 0.5, baseY);
  bodyGrad.addColorStop(0, 'rgba(55, 38, 30, 0.5)');
  bodyGrad.addColorStop(0.5, 'rgba(35, 24, 18, 0.7)');
  bodyGrad.addColorStop(1, 'rgba(26, 18, 16, 0.85)');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Body outline
  ctx.strokeStyle = 'rgba(200, 149, 108, 0.3)';
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();

  // Subtle highlight on left edge
  ctx.beginPath();
  ctx.moveTo(-mugW + 3 * scale, rimY + 15 * scale);
  ctx.lineTo(-mugW * taper + 3 * scale, baseY - 25 * scale);
  ctx.strokeStyle = 'rgba(240, 230, 220, 0.08)';
  ctx.lineWidth = 4 * scale;
  ctx.stroke();

  // ── Handle (thin, elegant) ──
  const handleX = mugW + 2 * scale;
  const handleTop = rimY + 25 * scale;
  const handleBot = rimY + mugH * 0.55;
  const handleOut = 38 * scale;

  ctx.beginPath();
  ctx.moveTo(handleX, handleTop);
  ctx.bezierCurveTo(
    handleX + handleOut, handleTop - 5 * scale,
    handleX + handleOut, handleBot + 5 * scale,
    handleX, handleBot
  );
  ctx.strokeStyle = 'rgba(200, 149, 108, 0.25)';
  ctx.lineWidth = 3.5 * scale;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Handle highlight
  ctx.beginPath();
  ctx.moveTo(handleX + 2 * scale, handleTop + 8 * scale);
  ctx.bezierCurveTo(
    handleX + handleOut - 4 * scale, handleTop + 3 * scale,
    handleX + handleOut - 4 * scale, handleBot - 3 * scale,
    handleX + 2 * scale, handleBot - 8 * scale
  );
  ctx.strokeStyle = 'rgba(240, 230, 220, 0.06)';
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // ── Rim (ellipse at top) ──
  const rimW = mugW;
  const rimH = 16 * scale;
  ctx.beginPath();
  ctx.ellipse(0, rimY, rimW, rimH, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(232, 192, 108, 0.35)';
  ctx.lineWidth = 2 * scale;
  ctx.stroke();
  // Rim inner shadow
  ctx.beginPath();
  ctx.ellipse(0, rimY, rimW * 0.92, rimH * 0.8, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(200, 149, 108, 0.12)';
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // ── Coffee Surface with Swirling Vortex ──
  const coffeeW = mugW * 0.88;
  const coffeeH = rimH * 0.75;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, rimY, coffeeW, coffeeH, 0, 0, Math.PI * 2);
  ctx.clip();

  // Base coffee color
  const coffeeBase = ctx.createRadialGradient(0, rimY, 0, 0, rimY, coffeeW);
  coffeeBase.addColorStop(0, 'rgba(90, 55, 30, 0.9)');
  coffeeBase.addColorStop(0.6, 'rgba(60, 35, 20, 0.85)');
  coffeeBase.addColorStop(1, 'rgba(40, 25, 15, 0.8)');
  ctx.fillStyle = coffeeBase;
  ctx.fillRect(-coffeeW, rimY - coffeeH, coffeeW * 2, coffeeH * 2);

  // Animated spiral swirl
  ctx.save();
  ctx.translate(0, rimY);
  for (let arm = 0; arm < 4; arm++) {
    ctx.beginPath();
    const baseAngle = (arm / 4) * Math.PI * 2 + t * 0.6;
    for (let j = 0; j <= 50; j++) {
      const frac = j / 50;
      const theta = frac * Math.PI * 3 + baseAngle;
      const r = frac * coffeeW * 0.85;
      const px = Math.cos(theta) * r;
      const py = Math.sin(theta) * r * (coffeeH / coffeeW); // squash for perspective
      if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    const alpha = 0.25 - arm * 0.04;
    ctx.strokeStyle = `rgba(232, 192, 108, ${alpha})`;
    ctx.lineWidth = (2.5 - arm * 0.4) * scale;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Center bright spot
  const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, coffeeW * 0.2);
  centerGlow.addColorStop(0, 'rgba(232, 192, 108, 0.35)');
  centerGlow.addColorStop(1, 'rgba(232, 192, 108, 0)');
  ctx.fillStyle = centerGlow;
  ctx.beginPath();
  ctx.arc(0, 0, coffeeW * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // End coffee clip

  // ── Steam Wisps (smooth S-curves rising and dissipating) ──
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const originX = (i - 2) * 22 * scale;
    const speed = 0.25 + i * 0.06;
    const cycle = (t * speed + i * 0.8) % 4;
    const life = cycle / 4; // 0→1

    // Smooth fade in and out
    const fadeIn = Math.min(life * 4, 1);
    const fadeOut = Math.max(0, 1 - (life - 0.6) / 0.4);
    const alpha = fadeIn * fadeOut * 0.22;
    if (alpha < 0.005) continue;

    const maxRise = 280 * scale;
    const riseY = life * maxRise;
    const drift = Math.sin(t * 0.8 + i * 2.1) * 35 * scale * life;
    const widthGrow = 1 + life * 2.5; // widens as it rises

    // Draw smooth S-curve with bezier
    const x0 = originX;
    const y0 = rimY - 8 * scale;
    const x3 = originX + drift;
    const y3 = y0 - riseY;
    const cp1x = originX + Math.sin(t * 1.2 + i) * 20 * scale;
    const cp1y = y0 - riseY * 0.33;
    const cp2x = originX + drift - Math.cos(t * 0.9 + i * 1.5) * 18 * scale;
    const cp2y = y0 - riseY * 0.66;

    // Glow trail (wider, fainter)
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x3, y3);
    ctx.strokeStyle = `rgba(240, 230, 220, ${alpha * 0.3})`;
    ctx.lineWidth = (6 + widthGrow * 3) * scale;
    ctx.stroke();

    // Main wisp
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x3, y3);
    ctx.strokeStyle = `rgba(245, 238, 228, ${alpha})`;
    ctx.lineWidth = (2 + widthGrow) * scale;
    ctx.stroke();

    // Dissipation cloud at the top
    if (life > 0.3) {
      const cloudAlpha = alpha * 0.5 * Math.min(1, (life - 0.3) / 0.3);
      const cloudR = (20 + life * 45) * scale;
      const cloudGrad = ctx.createRadialGradient(x3, y3, 0, x3, y3, cloudR);
      cloudGrad.addColorStop(0, `rgba(240, 230, 220, ${cloudAlpha})`);
      cloudGrad.addColorStop(0.5, `rgba(240, 230, 220, ${cloudAlpha * 0.3})`);
      cloudGrad.addColorStop(1, 'rgba(240, 230, 220, 0)');
      ctx.fillStyle = cloudGrad;
      ctx.beginPath();
      ctx.arc(x3, y3, cloudR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/** Large rotating sunburst with independently pulsing rays */
function drawSlideSunburst(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const scale = Math.min(W, H) / 900;
  const cx = W * 0.32; // Moved from 0.38 to 0.32
  const cy = H * 0.5;
  const maxR = Math.min(W, H) * 0.42;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.06);

  // 48 rays with independent pulsing
  const N = 48;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const isLong = i % 3 === 0;
    const isMedium = i % 3 === 1;

    // Independent sine-wave pulsing length per ray
    const pulseFactor = 0.7 + 0.3 * Math.sin(t * (0.8 + i * 0.13) + i * 0.7);
    let rayLen: number;
    let thick: number;
    let alpha: number;

    if (isLong) {
      rayLen = maxR * 0.95 * pulseFactor;
      thick = 4 * scale;
      alpha = 0.5 + 0.2 * Math.sin(t * 0.5 + i);
    } else if (isMedium) {
      rayLen = maxR * 0.65 * pulseFactor;
      thick = 2.5 * scale;
      alpha = 0.3 + 0.1 * Math.sin(t * 0.7 + i * 1.3);
    } else {
      rayLen = maxR * 0.4 * pulseFactor;
      thick = 1.5 * scale;
      alpha = 0.15 + 0.08 * Math.sin(t * 0.9 + i * 1.7);
    }

    const innerR = maxR * 0.12;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);

    // Draw the ray
    const grad = ctx.createLinearGradient(
      cosA * innerR, sinA * innerR,
      cosA * rayLen, sinA * rayLen
    );
    grad.addColorStop(0, `rgba(200,149,108,${alpha})`);
    grad.addColorStop(0.7, `rgba(232,192,108,${alpha * 0.6})`);
    grad.addColorStop(1, `rgba(200,149,108,0)`);
    ctx.beginPath();
    ctx.moveTo(cosA * innerR, sinA * innerR);
    ctx.lineTo(cosA * rayLen, sinA * rayLen);
    ctx.strokeStyle = grad;
    ctx.lineWidth = thick;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Tip glow dots on long rays
    if (isLong) {
      const tipX = cosA * rayLen;
      const tipY = sinA * rayLen;
      const tipGrad = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 8 * scale);
      tipGrad.addColorStop(0, `rgba(232,192,108,${alpha * 0.8})`);
      tipGrad.addColorStop(1, 'rgba(232,192,108,0)');
      ctx.beginPath();
      ctx.arc(tipX, tipY, 8 * scale, 0, Math.PI * 2);
      ctx.fillStyle = tipGrad;
      ctx.fill();
    }
  }

  // 5 concentric pulsing rings
  for (let r = 0; r < 5; r++) {
    const radius = maxR * (0.15 + r * 0.17) + Math.sin(t * 0.35 + r * 1.8) * 10 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(232,192,108,${0.12 - r * 0.018})`;
    ctx.lineWidth = (1.5 - r * 0.2) * scale;
    ctx.stroke();
  }

  // Dark center circle
  const centerR = maxR * 0.1;
  const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, centerR * 1.8);
  centerGrad.addColorStop(0, 'rgba(26,18,16,0.95)');
  centerGrad.addColorStop(0.6, 'rgba(26,18,16,0.8)');
  centerGrad.addColorStop(1, 'rgba(26,18,16,0)');
  ctx.beginPath();
  ctx.arc(0, 0, centerR * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = centerGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, centerR, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1210';
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,149,108,0.3)';
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  // Inner glow
  const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, centerR * 0.8);
  innerGlow.addColorStop(0, 'rgba(232,192,108,0.15)');
  innerGlow.addColorStop(1, 'rgba(232,192,108,0)');
  ctx.beginPath();
  ctx.arc(0, 0, centerR * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = innerGlow;
  ctx.fill();

  // Center dot
  ctx.beginPath();
  ctx.arc(0, 0, 3 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#e8c06c';
  ctx.fill();

  // 8 floating musical symbols orbiting near ray tips
  const symbols = ['\u266A', '\u266B', '\u2669', '\u266C', '\u266A', '\u266B', '\u2669', '\u266C'];
  ctx.font = `${14 * scale}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 8; i++) {
    const orbAngle = (i / 8) * Math.PI * 2 + t * 0.2;
    const orbR = maxR * (0.75 + 0.1 * Math.sin(t * 0.5 + i * 2));
    const sx = Math.cos(orbAngle) * orbR;
    const sy = Math.sin(orbAngle) * orbR;
    ctx.globalAlpha = 0.3 + 0.15 * Math.sin(t * 0.8 + i * 1.5);
    ctx.fillStyle = '#e8c06c';
    ctx.fillText(symbols[i], sx, sy);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Orbiting atoms centered on screen */
function drawSlideAtoms(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const scale = Math.min(W, H) / 900;
  const cx = W * 0.72;
  const cy = H * 0.5;

  ctx.save();

  // Central nucleus with radial glow
  const nucleusR = 20 * scale;
  const nucleusGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucleusR * 5);
  nucleusGlow.addColorStop(0, 'rgba(200,149,108,0.2)');
  nucleusGlow.addColorStop(0.3, 'rgba(200,149,108,0.08)');
  nucleusGlow.addColorStop(1, 'rgba(200,149,108,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, nucleusR * 5, 0, Math.PI * 2);
  ctx.fillStyle = nucleusGlow;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, nucleusR, 0, Math.PI * 2);
  const nucGrad = ctx.createRadialGradient(cx - nucleusR * 0.3, cy - nucleusR * 0.3, 0, cx, cy, nucleusR);
  nucGrad.addColorStop(0, '#e8c06c');
  nucGrad.addColorStop(1, '#c8956c');
  ctx.fillStyle = nucGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,192,108,0.5)';
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // 4 orbital paths with elements
  const orbits = [
    { rx: 180 * scale, ry: 80 * scale, tilt: -0.3, speed: 1.0, elements: 3, color: '#c8956c', ccw: false },
    { rx: 250 * scale, ry: 110 * scale, tilt: 0.5, speed: 0.7, elements: 4, color: '#e8c06c', ccw: true },
    { rx: 140 * scale, ry: 130 * scale, tilt: 1.2, speed: 1.3, elements: 2, color: '#9b6b8a', ccw: false },
    { rx: 300 * scale, ry: 60 * scale, tilt: -0.8, speed: 0.5, elements: 3, color: '#7a4a6b', ccw: true },
  ];

  for (const orbit of orbits) {
    // Draw orbital path
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(orbit.tilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, orbit.rx, orbit.ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `${orbit.color}18`;
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
    ctx.restore();

    // Draw orbiting elements with trails
    for (let e = 0; e < orbit.elements; e++) {
      const dirMul = orbit.ccw ? -1 : 1;
      const baseAngle = dirMul * t * orbit.speed + (e / orbit.elements) * Math.PI * 2;

      // Trail: 5 fading copies
      for (let tr = 5; tr >= 0; tr--) {
        const trailAngle = baseAngle - tr * 0.12 * dirMul;
        const ex = cx + Math.cos(orbit.tilt) * Math.cos(trailAngle) * orbit.rx - Math.sin(orbit.tilt) * Math.sin(trailAngle) * orbit.ry;
        const ey = cy + Math.sin(orbit.tilt) * Math.cos(trailAngle) * orbit.rx + Math.cos(orbit.tilt) * Math.sin(trailAngle) * orbit.ry;

        const trAlpha = tr === 0 ? 0.8 : Math.max(0, 0.3 - tr * 0.06);
        const trSize = tr === 0 ? 7 * scale : (5 - tr * 0.6) * scale;

        if (trAlpha < 0.01 || trSize < 0.5) continue;

        ctx.globalAlpha = trAlpha;

        if (tr === 0) {
          // Main element with glow
          const elemGlow = ctx.createRadialGradient(ex, ey, 0, ex, ey, trSize * 3);
          elemGlow.addColorStop(0, orbit.color + '40');
          elemGlow.addColorStop(1, orbit.color + '00');
          ctx.beginPath();
          ctx.arc(ex, ey, trSize * 3, 0, Math.PI * 2);
          ctx.fillStyle = elemGlow;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(ex, ey, trSize, 0, Math.PI * 2);
        ctx.fillStyle = orbit.color;
        ctx.fill();
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Subtle floating particles for slides without specific animations */
function drawSlideAmbient(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, intensity: number) {
  const scale = Math.min(W, H) / 900;
  const count = Math.floor(20 * intensity);
  ctx.save();

  for (let i = 0; i < count; i++) {
    const phase = i * 2.37 + t * 0.15;
    const x = W * (0.1 + 0.8 * ((Math.sin(phase * 0.7) + 1) / 2));
    const y = H * (0.1 + 0.8 * ((Math.cos(phase * 0.5 + i) + 1) / 2));
    const r = (1.5 + Math.sin(i * 3.1 + t * 0.3) * 1) * scale;
    const alpha = 0.08 + 0.06 * Math.sin(t * 0.5 + i * 1.7);

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 === 0 ? '#c8956c' : i % 3 === 1 ? '#e8c06c' : '#9b6b8a';
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ═══════════════════════════════════════════════
//  useSlideCanvas — per-slide decoration canvas
//  Antigravity-style: floating elements, connection
//  mesh, sparks around the main per-slide visual
// ═══════════════════════════════════════════════
function useSlideCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  slideNum: number,
  mouseRef: React.RefObject<{ x: number; y: number }>,
) {
  const rafRef = useRef(0);
  const timeRef = useRef(0);
  const elemsRef = useRef<FloatingElement[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const initSlideRef = useRef(-1);
  const opacityRef = useRef(0); // Track background fade-in
  const visualOpacityRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Re-initialize floating elements when slide changes
    if (initSlideRef.current !== slideNum) {
      initSlideRef.current = slideNum;
      opacityRef.current = 0; // Reset opacity for new slide
      visualOpacityRef.current = 0;
      elemsRef.current = [];
      sparksRef.current = [];
      const types: FloatingElement['type'][] = ['bean', 'bean', 'note-box', 'eq-box', 'wave-box'];
      const count = [5, 6, 8].includes(slideNum) ? 22 : 12;
      for (let i = 0; i < count; i++) {
        const type = types[i % types.length];
        const isBean = type === 'bean';
        elemsRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.22,
          vy: -(0.05 + Math.random() * 0.22) * (isBean ? 1.1 : 0.65),
          size: isBean ? 7 + Math.random() * 11 : 13 + Math.random() * 9,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * (isBean ? 0.007 : 0.003),
          opacity: isBean ? 0.2 + Math.random() * 0.18 : 0.14 + Math.random() * 0.13,
          phase: Math.random() * Math.PI * 2,
          type,
          colorIdx: Math.floor(Math.random() * EL_COLORS.length),
        });
      }
    }

    const draw = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      ctx.clearRect(0, 0, W, H);

      // Smoothly ramp up opacity
      if (opacityRef.current < 1) opacityRef.current += 0.012;
      // Visual fades in after floating elements (delayed, slower)
      if (opacityRef.current > 0.4) {
        visualOpacityRef.current = Math.min(1, visualOpacityRef.current + 0.008);
      }
      ctx.save();
      ctx.globalAlpha = opacityRef.current;

      const elems = elemsRef.current;
      const sparks = sparksRef.current;
      const m = mouseRef.current;

      // ── Connection mesh between floating elements ──
      ctx.lineWidth = 0.4;
      for (let i = 0; i < elems.length; i++) {
        for (let j = i + 1; j < elems.length; j++) {
          const dx = elems[i].x - elems[j].x, dy = elems[i].y - elems[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14400) {
            const d = Math.sqrt(d2);
            ctx.strokeStyle = `rgba(200,149,108,${0.045 * (1 - d / 120)})`;
            ctx.beginPath(); ctx.moveTo(elems[i].x, elems[i].y); ctx.lineTo(elems[j].x, elems[j].y); ctx.stroke();
          }
        }
      }

      // ── Update & draw floating elements (antigravity float) ──
      for (const el of elems) {
        if (m && m.x > 0) {
          const dx = el.x - m.x, dy = el.y - m.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130 && d > 0) {
            const f = (130 - d) / 130 * 0.25;
            el.vx += (dx / d) * f; el.vy += (dy / d) * f;
          }
        }
        el.x += el.vx + Math.sin(t * 0.28 + el.phase) * 0.09;
        el.y += el.vy;
        el.rotation += el.vr;
        el.vx *= 0.996; el.vy = el.vy * 0.996 - 0.05;
        if (el.y < -55) { el.y = H + 55; el.x = Math.random() * W; }
        if (el.x < -55) el.x = W + 55;
        if (el.x > W + 55) el.x = -55;

        ctx.save();
        ctx.translate(el.x, el.y); ctx.rotate(el.rotation);
        ctx.globalAlpha = el.opacity + Math.sin(t * 0.75 + el.phase) * 0.03;
        const color = EL_COLORS[el.colorIdx];
        switch (el.type) {
          case 'bean': drawBeanShape(ctx, el.size, el.colorIdx); break;
          case 'note-box': drawNoteEl(ctx, el.size, color); break;
          case 'eq-box': drawEqEl(ctx, el.size, color, t * 2 + el.phase); break;
          case 'wave-box': drawWaveEl(ctx, el.size, color, t * 1.5 + el.phase); break;
        }
        ctx.restore();
      }

      // ── Main per-slide visual (fades in from background) ──
      ctx.save();
      ctx.globalAlpha = visualOpacityRef.current;
      switch (slideNum) {
        case 5: drawSlideMug(ctx, W, H, t); break;
        case 6: drawSlideSunburst(ctx, W, H, t); break;
        case 8: drawSlideAtoms(ctx, W, H, t); break;
        default: drawSlideAmbient(ctx, W, H, t, 0.5); break;
      }
      ctx.restore();

      // ── Sparks for slides with main visuals ──
      if ([5, 6, 8].includes(slideNum)) {
        const sx = slideNum === 5 ? W * 0.68 : slideNum === 6 ? W * 0.38 : W * 0.72;
        const sy = slideNum === 5 ? H * 0.48 : H * 0.5;
        if (Math.random() < 0.12) {
          sparks.push({
            x: sx + (Math.random() - 0.5) * 140,
            y: sy + (Math.random() - 0.5) * 70,
            vx: (Math.random() - 0.5) * 1.4,
            vy: -(0.4 + Math.random() * 1.1),
            size: 0.6 + Math.random() * 1.8,
            opacity: 0.35 + Math.random() * 0.4,
            life: 0, maxLife: 35 + Math.random() * 50,
            hue: 20 + Math.random() * 32,
          });
          if (sparks.length > 35) sparks.splice(0, 10);
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.x += s.vx; s.y += s.vy; s.vy -= 0.012; s.life++;
          if (s.life >= s.maxLife) { sparks.splice(i, 1); continue; }
          const a = s.opacity * Math.sin((s.life / s.maxLife) * Math.PI);
          if (a < 0.01) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = `hsl(${s.hue}, 70%, 72%)`;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // ── Bottom warm flare (all slides) ──
      const flareH = H * 0.18;
      const flareGrad = ctx.createLinearGradient(0, H - flareH, 0, H);
      flareGrad.addColorStop(0, 'rgba(200,149,108,0)');
      flareGrad.addColorStop(0.4, 'rgba(200,149,108,0.025)');
      flareGrad.addColorStop(0.7, 'rgba(232,192,108,0.05)');
      flareGrad.addColorStop(1, 'rgba(232,192,108,0.09)');
      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, H - flareH, W, flareH);
      const lineGrad = ctx.createLinearGradient(W * 0.15, 0, W * 0.85, 0);
      lineGrad.addColorStop(0, 'rgba(232,192,108,0)');
      lineGrad.addColorStop(0.5, 'rgba(232,192,108,0.12)');
      lineGrad.addColorStop(1, 'rgba(232,192,108,0)');
      ctx.fillStyle = lineGrad;
      ctx.fillRect(0, H - 2, W, 2);

      ctx.restore(); // Restore from globalAlpha fade-in

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, slideNum, mouseRef]);
}

// ═══════════════════════════════════════════════
//  useNotePlayer — Web Audio API random notes
// ═══════════════════════════════════════════════
function useNotePlayer() {
  const ctxRef = useRef<AudioContext | null>(null);

  const playNote = useCallback(() => {
    try {
      if (!ctxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current = new AudioCtx();
      }
      const audioCtx = ctxRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // C pentatonic scale across 2 octaves (~10 notes)
      const notes = [
        261.63, 293.66, 329.63, 392.00, 440.00,
        523.25, 587.33, 659.25, 783.99, 880.00,
      ];
      const freq = notes[Math.floor(Math.random() * notes.length)];
      const types: OscillatorType[] = ['sine', 'triangle', 'square'];
      const oscType = types[Math.floor(Math.random() * types.length)];

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = oscType;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {
      // silently ignore audio errors
    }
  }, []);

  return playNote;
}

// ═══════════════════════════════════════════════
//  FEATURE CARD
// ═══════════════════════════════════════════════

/** Feature card with click-to-popup modal detail */
function FeatureCard({
  icon, title, desc, detail, color, index, expanded, onToggle,
}: {
  icon: string; title: string; desc: string; detail: string;
  color: string; index: number; expanded: boolean; onToggle: () => void;
}) {
  return (
    <>
      <motion.div
        className="bg-roast/80 rounded-xl border border-roast-light/50 p-4 backdrop-blur group cursor-pointer transition-all relative overflow-hidden"
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2 + index * 0.08, type: 'spring' as const, stiffness: 200, damping: 15 }}
        whileHover={{ y: -4, scale: 1.03, borderColor: `${color}44` }}
        onClick={onToggle}
      >
        <span className="text-2xl block mb-2">{icon}</span>
        <h3 className="text-sm font-bold text-cream mb-1">{title}</h3>
        <p className="text-[11px] text-warm-dim/70 leading-relaxed">{desc}</p>
        <div className="absolute top-3 right-3 text-[8px] text-warm-dim/30 uppercase tracking-wider">
          click for more
        </div>
      </motion.div>

      {/* MODAL OVERLAY */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onToggle}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-espresso/80 backdrop-blur-sm" />
            {/* Modal card */}
            <motion.div
              className="relative max-w-lg w-full bg-roast rounded-2xl border p-8 shadow-2xl"
              style={{ borderColor: `${color}44`, boxShadow: `0 0 40px ${color}20` }}
              initial={{ scale: 0.7, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <button onClick={onToggle} className="absolute top-4 right-4 text-warm-dim hover:text-cream text-lg">&times;</button>
              <span className="text-4xl block mb-4">{icon}</span>
              <h3 className="text-xl font-bold text-cream mb-2">{title}</h3>
              <p className="text-sm text-warm-dim/80 mb-4">{desc}</p>
              <div className="border-t border-roast-light/30 pt-4">
                <p className="text-sm leading-relaxed" style={{ color }}>{detail}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════
//  HELPER COMPONENTS
// ═══════════════════════════════════════════════
function Eyebrow({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      className="text-[11px] text-caramel uppercase tracking-[4px] font-bold mb-4"
      initial={{ opacity: 0, letterSpacing: '14px' }}
      animate={{ opacity: 1, letterSpacing: '4px' }}
      transition={{ delay, duration: 0.8, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function GradientText({ children, colors = '#c8956c, #e8c06c, #f0e6dc', className = '' }: { children: React.ReactNode; colors?: string; className?: string }) {
  return (
    <span className={`text-transparent bg-clip-text ${className}`} style={{ backgroundImage: `linear-gradient(135deg, ${colors})` }}>
      {children}
    </span>
  );
}

function Divider() {
  return (
    <motion.div
      className="w-20 h-[2px] mx-auto my-6"
      style={{ background: 'linear-gradient(90deg, transparent, #c8956c, #e8c06c, #c8956c, transparent)' }}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 0.6 }}
      transition={{ delay: 0.3, duration: 0.8 }}
    />
  );
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 35);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <div className="flex-1 bg-caramel/10 rounded-xl p-3">
      <p className="text-sm text-cream/90">
        {displayed}
        {displayed.length < text.length && started && (
          <motion.span className="inline-block w-0.5 h-4 bg-caramel ml-0.5 align-middle" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
        )}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════
export function BrewBeatsScroll({ onEnterApp }: BrewBeatsScrollProps) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const [entered, setEntered] = useState(false);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

  // Particle field
  const particleRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  useAntigravityBG(particleRef, mouseRef);

  // Per-slide canvas
  const slideCanvasRef = useRef<HTMLCanvasElement>(null);
  useSlideCanvas(slideCanvasRef, slide, mouseRef);

  // Mouse tracking for particles
  useEffect(() => {
    const handler = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const go = useCallback((target: number) => {
    if (transitioning) return;
    const clamped = Math.max(0, Math.min(TOTAL - 1, target));
    if (clamped === slide) return;
    setDirection(clamped > slide ? 1 : -1);
    setTransitioning(true);
    setSlide(clamped);
    setTimeout(() => setTransitioning(false), 750);
  }, [slide, transitioning]);

  const next = useCallback(() => go(slide + 1), [go, slide]);
  const prev = useCallback(() => go(slide - 1), [go, slide]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault(); next();
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); prev();
      }
      if (e.key === 'Home') { e.preventDefault(); go(0); }
      if (e.key === 'End') { e.preventDefault(); go(TOTAL - 1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, go]);

  // Wheel navigation with cooldown
  useEffect(() => {
    let cooldown = false;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (cooldown) return;
      if (Math.abs(e.deltaY) < 30) return;
      cooldown = true;
      if (e.deltaY > 0) next(); else prev();
      setTimeout(() => { cooldown = false; }, 900);
    };
    window.addEventListener('wheel', handler, { passive: false });
    return () => window.removeEventListener('wheel', handler);
  }, [next, prev]);

  const handleEnter = useCallback(() => {
    setEntered(true);
    setTimeout(onEnterApp, 700);
  }, [onEnterApp]);

  // ═══════════════════════════════════════════════
  //  SLIDE CONTENT
  // ═══════════════════════════════════════════════
  const slides: Record<number, React.ReactNode> = {
    // ── 0: HERO ──
    0: (
      <motion.div className="flex flex-col items-center justify-center h-full text-center px-6 relative" {...stagger}>
        <motion.div className="mb-8" {...popIn}>
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-caramel via-gold to-dusk flex items-center justify-center shadow-lg shadow-caramel/30">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1a1210" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        </motion.div>
        <motion.h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none mb-4" {...fadeUp}>
          <GradientText colors="#f0e6dc, #e8c5a0, #c8956c, #e8c06c, #f0e6dc">BrewBeats</GradientText>
        </motion.h1>
        <motion.p className="text-lg md:text-2xl text-warm-dim max-w-lg mb-8" {...fadeUp}>
          AI-Powered Music Composition Studio
        </motion.p>
        
        <motion.button
          onClick={handleEnter}
          className="px-8 py-4 bg-caramel text-espresso rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl mb-12 flex items-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          Open App
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </motion.button>

        <motion.div className="flex gap-6 text-[10px] text-warm-dim/50 uppercase tracking-[3px]" {...fadeUp}>
          <span>Browser-Based</span><span className="text-caramel/30">|</span>
          <span>Real-Time</span><span className="text-caramel/30">|</span>
          <span>AI-Powered</span>
        </motion.div>
        <motion.div
          className="absolute bottom-12 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        >
          <span className="text-[10px] text-warm-dim/40 uppercase tracking-[3px]">Scroll or Press Keys</span>
          <motion.div
            className="w-5 h-8 rounded-full border-2 border-caramel/30 flex justify-center pt-1"
            animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <div className="w-1 h-2 rounded-full bg-caramel/50" />
          </motion.div>
        </motion.div>
        {[...Array(6)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-caramel/10 text-4xl pointer-events-none select-none"
            style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0], opacity: [0.05, 0.15, 0.05] }}
            transition={{ repeat: Infinity, duration: 4 + i, delay: i * 0.5 }}
          >
            {['\u266A', '\u266B', '\u2669', '\u266C', '\u266A', '\u266B'][i]}
          </motion.span>
        ))}
      </motion.div>
    ),

    // ── 1: THE PROBLEM ──
    1: (
      <motion.div className="flex flex-col items-center justify-center h-full px-6 max-w-4xl mx-auto" {...stagger}>
        <Eyebrow>The Challenge</Eyebrow>
        <motion.h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-cream text-center mb-4 leading-tight" {...fadeUp}>
          Creating music shouldn&apos;t require{' '}
          <GradientText colors="#e85a5a, #e8956c, #c8956c">a degree</GradientText>
        </motion.h2>
        <motion.p className="text-warm-dim/70 text-center mb-10 max-w-xl text-base" {...fadeUp}>
          For decades, music production has been locked behind barriers that keep most people from ever creating.
        </motion.p>
        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
          {[
            { icon: '\uD83D\uDCB0', title: 'Expensive Tools', desc: 'Professional DAWs cost $200\u2013600+/year', color: '#e85a5a' },
            { icon: '\uD83D\uDCDA', title: 'Steep Learning Curve', desc: 'Years of training to produce quality music', color: '#e8956c' },
            { icon: '\uD83D\uDD27', title: 'Complex Interfaces', desc: 'Hundreds of knobs, menus, and parameters', color: '#c8956c' },
            { icon: '\uD83D\uDEAB', title: 'Creativity Bottleneck', desc: 'Technical skills gap limits creative expression', color: '#7a4a6b' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="bg-roast/80 rounded-2xl border border-roast-light/50 p-5 backdrop-blur group hover:border-red-400/20 transition-colors"
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.12, type: 'spring' as const, stiffness: 200, damping: 16 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <span className="text-3xl block mb-3">{item.icon}</span>
              <h3 className="text-sm font-bold mb-1" style={{ color: item.color }}>{item.title}</h3>
              <p className="text-[11px] text-warm-dim/60 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    ),

    // ── 2: OUR PURPOSE ──
    2: (
      <motion.div className="flex flex-col items-center justify-center h-full text-center px-6 max-w-4xl mx-auto" {...stagger}>
        <Eyebrow delay={0.1}>Our Purpose</Eyebrow>
        <motion.h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-cream leading-tight mb-8" {...fadeUp}>
          Empowering Everyone to <br />
          <GradientText colors="#c8956c, #e8c06c, #f0e6dc">Create Without Limits</GradientText>
        </motion.h2>
        
        <div className="flex flex-col md:flex-row items-center gap-10 w-full mb-12">
          <motion.div
            className="flex-1 bg-roast/80 rounded-2xl border border-caramel/20 p-8 backdrop-blur relative overflow-hidden"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
          >
            <p className="text-cream/90 text-lg leading-relaxed text-left">
              &ldquo;We believe music is a universal language. BrewBeats removes technical barriers by letting
              <span className="text-caramel font-semibold"> AI handle the complexity</span> while you focus on
              <span className="text-gold font-semibold"> pure creativity</span>.&rdquo;
            </p>
          </motion.div>

          <div className="flex flex-col gap-4 w-full md:w-64">
            {[
              { word: 'Accessible', icon: '\u2728', color: '#c8956c' },
              { word: 'Instant', icon: '\u26A1', color: '#e8c06c' },
              { word: 'Limitless', icon: '\u221E', color: '#f0e6dc' },
            ].map((v, i) => (
              <motion.div key={v.word}
                className="bg-roast/60 rounded-xl border border-caramel/15 px-6 py-4 text-caramel/80 font-semibold backdrop-blur flex items-center justify-between group"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.15, type: 'spring' as const, stiffness: 180, damping: 14 }}
                whileHover={{ x: -10, backgroundColor: 'rgba(200,149,108,0.1)' }}
              >
                <span className="text-sm uppercase tracking-widest">{v.word}</span>
                <span className="text-2xl group-hover:scale-125 transition-transform">{v.icon}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <Divider />
      </motion.div>
    ),

    // ── 3: HOW IT WORKS ──
    3: (
      <motion.div className="flex flex-col items-center justify-center h-full px-6" {...stagger}>
        <Eyebrow>The System</Eyebrow>
        <motion.h2 className="text-3xl md:text-5xl font-bold text-cream text-center mb-12" {...fadeUp}>
          Three <GradientText colors="#c8956c, #e8c06c">Simple</GradientText> Steps
        </motion.h2>
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-4 max-w-4xl w-full">
          {[
            { num: '01', title: 'Describe', desc: 'Type what you want to hear in plain English \u2014 genre, mood, tempo, instruments', icon: '\uD83D\uDCAC', color: '#c8956c' },
            { num: '02', title: 'Generate', desc: 'AI composes a full multi-track arrangement with proper music theory', icon: '\uD83E\uDDE0', color: '#e8c06c' },
            { num: '03', title: 'Play & Mix', desc: 'Listen instantly, edit notes, adjust effects, and export your creation', icon: '\uD83C\uDFB5', color: '#7a4a6b' },
          ].map((step, i) => (
            <motion.div key={i} className="flex-1 w-full" variants={fadeUp} custom={i}>
              <motion.div
                className="relative bg-roast/80 rounded-2xl border border-roast-light/50 p-6 text-center backdrop-blur group hover:border-caramel/30 transition-colors"
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
              >
                <div className="text-4xl mb-4">{step.icon}</div>
                <div className="text-[10px] font-bold uppercase tracking-[3px] mb-2" style={{ color: step.color }}>{step.num}</div>
                <h3 className="text-xl font-bold text-cream mb-2">{step.title}</h3>
                <p className="text-sm text-warm-dim">{step.desc}</p>
                {i < 2 && (
                  <motion.div
                    className="hidden md:block absolute -right-6 top-1/2 text-caramel/40 text-2xl z-10"
                    animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    &rarr;
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    ),

    // ── 4: USER JOURNEY ──
    4: (
      <motion.div className="flex flex-col items-center justify-center h-full px-6" {...stagger}>
        <Eyebrow>Experience</Eyebrow>
        <motion.h2 className="text-3xl md:text-5xl font-bold text-cream text-center mb-10" {...fadeUp}>
          Your <GradientText colors="#c8956c, #e8c06c, #f0e6dc">Musical Journey</GradientText>
        </motion.h2>
        <div className="relative max-w-2xl w-full">
          {/* Vertical line */}
          <motion.div
            className="absolute left-6 top-0 bottom-0 w-[2px]"
            style={{ background: 'linear-gradient(180deg, transparent, #c8956c, #e8c06c, #c8956c, transparent)' }}
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
            transition={{ delay: 0.2, duration: 1, ease: EASE }}
          />
          {[
            { step: '01', title: 'Open BrewBeats', desc: 'Visit the app in any modern browser \u2014 no downloads or signups', icon: '\uD83C\uDF10' },
            { step: '02', title: 'Describe Your Vision', desc: 'Type a prompt like "chill lo-fi with piano and soft drums at 80 BPM"', icon: '\uD83C\uDFA4' },
            { step: '03', title: 'AI Composes', desc: 'BrewBeats Local AI generates a structured multi-track composition in seconds', icon: '🤖' },
            { step: '04', title: 'Preview in Timeline', desc: 'See every note visualized on a professional piano-roll style timeline', icon: '\uD83C\uDFBC' },
            { step: '05', title: 'Mix & Master', desc: 'Adjust volume, reverb, delay, and apply one-click effects per track', icon: '\uD83C\uDFA7' },
            { step: '06', title: 'Export & Share', desc: 'Download your finished composition as a WAV file', icon: '\uD83D\uDCE5' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              className="relative flex items-start gap-4 mb-5 pl-14"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.5, ease: EASE }}
            >
              <motion.div
                className="absolute left-3 w-7 h-7 rounded-full bg-gradient-to-br from-caramel to-gold flex items-center justify-center text-espresso text-[10px] font-bold shadow-md shadow-caramel/20"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.4 + i * 0.15, type: 'spring' as const, stiffness: 300 }}
              >
                {item.icon}
              </motion.div>
              <div>
                <div className="text-[9px] text-caramel/60 uppercase tracking-[2px] mb-0.5">{item.step}</div>
                <h3 className="text-sm font-bold text-cream mb-1">{item.title}</h3>
                <p className="text-[11px] text-warm-dim/60 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    ),

    // ── 5: AI ENGINE (Prompt to Beat) ──
    5: (
      <motion.div className="flex flex-col h-full pt-20 px-12" {...stagger}>
        <div className="flex flex-col items-center mb-8">
          <Eyebrow delay={0.1}>01 / Prompt to Beat</Eyebrow>
          <h2 className="text-4xl md:text-6xl font-bold text-cream leading-tight text-center">
            <GradientText colors="#c8956c, #e8c06c">Prompt to Beat</GradientText>
          </h2>
        </div>
        
        <div className="flex items-center flex-1 gap-12">
          <motion.div className="w-[45%] max-w-xl" {...fadeLeft}>
            <p className="text-lg text-warm-dim leading-relaxed mb-8">
              Powered by our <span className="text-gold font-semibold text-xl">Local AI Engine</span>, BrewBeats understands music theory, chord progressions, and genre conventions to generate complete arrangements from a simple text prompt.
            </p>
            <div className="flex gap-2 flex-wrap mb-10">
              {['Lo-fi Hip Hop', 'Jazz Fusion', 'Ambient', 'Classical', 'EDM', 'R&B', 'Rock', 'Latin'].map((tag, i) => (
                <motion.span
                  key={tag} className="px-4 py-2 rounded-full text-xs font-medium border border-caramel/30 text-caramel bg-caramel/5 backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.06, type: 'spring' as const, stiffness: 300 }}
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(200,149,108,0.15)' }}
                >
                  {tag}
                </motion.span>
              ))}
            </div>
            <motion.div className="bg-roast/90 rounded-2xl border border-roast-light/60 p-6 backdrop-blur-md shadow-2xl" {...fadeUp}>
              <div className="text-[10px] text-caramel font-bold uppercase tracking-widest mb-4 text-center border-b border-caramel/20 pb-2">Live Session Preview</div>
              {[
                { role: 'user', text: 'Make a jazz beat with walking bass' },
                { role: 'ai', text: 'Brewing composition: piano, upright bass, drums, trumpet, sax (7 tracks)...' },
              ].map((msg, i) => (
                <motion.div
                  key={i} className={`flex gap-3 mb-4 ${msg.role === 'ai' ? '' : 'justify-end'}`}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 40 : -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.4, type: 'spring' }}
                >
                  <div className={`text-sm px-4 py-3 rounded-2xl max-w-[90%] shadow-lg ${
                    msg.role === 'user' ? 'bg-caramel text-espresso font-medium' : 'bg-espresso/80 text-warm-dim border border-roast-light'
                  }`}>{msg.text}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          {/* Visual area on right handled by per-slide canvas */}
          <div className="flex-1" />
        </div>
      </motion.div>
    ),

    // ── 6: VISUAL TOOLS ──
    6: (
      <motion.div className="flex flex-col h-full pt-20 px-12" {...stagger}>
        <div className="flex flex-col items-center mb-8">
          <Eyebrow>02 / Visualize</Eyebrow>
          <h2 className="text-4xl md:text-6xl font-bold text-cream leading-tight text-center">
            Visual <GradientText colors="#7a4a6b, #9b6b8a, #c8956c">Timeline</GradientText>
          </h2>
        </div>

        <div className="flex items-center flex-1 gap-12 flex-row-reverse">
          <motion.div className="w-[45%] max-w-xl" {...fadeRight}>
            <p className="text-lg text-warm-dim/90 leading-relaxed mb-8">
              Watch your music come to life. See every note and beat rendered in real-time on a <span className="text-caramel font-bold">professional piano-roll editor</span> built for the modern web.
            </p>
            <div className="flex gap-2 flex-wrap mb-10">
              {['Piano Roll', 'Drum Grid', 'Live Playhead', 'Zoom'].map((tag, i) => (
                <motion.span
                  key={tag} className="px-4 py-2 rounded-full text-xs font-medium border border-dusk/50 text-dusk-light bg-dusk/10 backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.08, type: 'spring' as const, stiffness: 300 }}
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(155,107,138,0.2)' }}
                >
                  {tag}
                </motion.span>
              ))}
            </div>
            {/* Compact timeline mockup */}
            <motion.div className="bg-roast/90 rounded-2xl border border-roast-light/60 overflow-hidden backdrop-blur-md shadow-2xl" {...fadeUp}>
              <div className="px-4 py-3 text-[10px] text-caramel font-bold uppercase tracking-widest border-b border-caramel/20 flex justify-between items-center">
                <span>Timeline Editor</span>
                <span className="flex gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC</span>
              </div>
              {[
                { name: 'Piano', color: '#c8956c', notes: [0,2,4,5,7] },
                { name: 'Drums', color: '#e8c06c', notes: [0,1,2,3,4,5,6,7] },
                { name: 'Bass', color: '#7a4a6b', notes: [0,2,4,6] },
              ].map((tr, ti) => (
                <motion.div key={tr.name} className="flex border-b border-roast-light/30 h-10"
                  initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + ti * 0.12 }}
                >
                  <div className="w-20 px-3 flex items-center gap-2 border-r border-roast-light/30 bg-roast-light/10">
                    <div className="w-3 h-3 rounded shadow-sm" style={{ backgroundColor: tr.color }} />
                    <span className="text-[10px] text-cream font-bold">{tr.name}</span>
                  </div>
                  <div className="flex-1 relative">
                    {tr.notes.map((n, ni) => (
                      <motion.div key={ni} className="absolute h-6 top-2 rounded shadow-lg"
                        style={{ left: `${(n/8)*100}%`, width: `${tr.name === 'Drums' ? 8 : 12}%`, backgroundColor: tr.color, opacity: 0.85 }}
                        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                        transition={{ delay: 0.6 + ti * 0.08 + ni * 0.06, type: 'spring' as const, stiffness: 300 }}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          {/* Visual area on left handled by per-slide canvas */}
          <div className="flex-1" />
        </div>
      </motion.div>
    ),

    // ── 7: KEY FEATURES (Click-to-expand popup cards — atoms canvas draws behind) ──
    7: (
      <motion.div className="flex flex-col items-center justify-center h-full px-6 relative z-10" {...stagger}>
        <Eyebrow>Highlights</Eyebrow>
        <motion.h2 className="text-3xl md:text-5xl font-bold text-cream text-center mb-8" {...fadeUp}>
          Everything You <GradientText colors="#c8956c, #e8c06c">Need</GradientText>
        </motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl w-full">
          {[
            { icon: '\uD83C\uDFA8', title: 'One-Click Effects', desc: 'Punch Bass, Lo-Fi Vibes, Spacey Reverb and more', detail: 'Apply preset effect chains with a single click. Each preset is tuned by genre — from heavy bass compression to dreamy lo-fi warmth with vinyl crackle. Stack multiple presets for unique sounds.', color: '#c8956c' },
            { icon: '\uD83D\uDCE5', title: 'Export WAV', desc: 'Download your composition as a .wav audio file', detail: 'High-quality 44.1kHz stereo WAV export with proper mixing. All tracks are rendered in real-time through Tone.js and captured to a downloadable file.', color: '#e8c06c' },
            { icon: '\u2328\uFE0F', title: 'Keyboard Shortcuts', desc: 'Space to play, Ctrl+Z undo, Ctrl+E export', detail: 'Full keyboard control: Space (play/pause), Ctrl+Z/Y (undo/redo), Ctrl+E (export), Ctrl+S (save session), arrow keys for timeline navigation.', color: '#7a4a6b' },
            { icon: '\uD83D\uDCBE', title: 'Session Manager', desc: 'Save, rename, and switch between projects', detail: 'Auto-save to browser storage. Create multiple sessions, rename them, duplicate, or delete. Your work is always preserved across browser sessions.', color: '#9b6b8a' },
            { icon: '\uD83C\uDFA7', title: 'Real-time Mixer', desc: 'Per-track volume, reverb, and delay controls', detail: 'Professional-style mixer with individual track controls. Adjust volume, reverb wet/dry, delay time and feedback. Changes apply instantly while playing.', color: '#c8956c' },
            { icon: '\uD83D\uDD04', title: 'Patch Mode', desc: 'Modify existing compositions incrementally', detail: 'Tell the AI to modify your existing composition — add a track, change tempo, swap instruments, or tweak the arrangement without starting from scratch.', color: '#e8c06c' },
          ].map((feat, i) => (
            <FeatureCard
              key={feat.title}
              icon={feat.icon}
              title={feat.title}
              desc={feat.desc}
              detail={feat.detail}
              color={feat.color}
              index={i}
              expanded={expandedFeature === i}
              onToggle={() => setExpandedFeature(expandedFeature === i ? null : i)}
            />
          ))}
        </div>
        <motion.p className="text-[10px] text-warm-dim/40 mt-4 text-center" {...fadeUp}>
          Click any card to see more details
        </motion.p>
      </motion.div>
    ),

    // ── 8: AI ARCHITECTURE ──
    8: (
      <motion.div className="flex items-center h-full px-12 gap-4" {...stagger}>
        <motion.div className="w-[45%] max-w-xl" {...fadeLeft}>
          <Eyebrow delay={0.1}>Architecture</Eyebrow>
          <h2 className="text-3xl md:text-5xl font-bold text-cream mb-4 leading-tight">
            How <GradientText colors="#c8956c, #e8c06c, #9b6b8a">AI Creates</GradientText> Music
          </h2>
          <div className="space-y-3 mb-6">
            {[
              { label: 'Natural Language Input', desc: 'Your prompt is analyzed for genre, mood, tempo, instruments, and duration', color: '#c8956c' },
              { label: 'BrewBeats AI Processing', desc: 'Local AI engine applies music theory — chord progressions, rhythmic patterns, harmonics', color: '#e8c06c' },
              { label: 'Structured JSON Output', desc: 'Multi-track composition with precise note timing, velocity, and duration', color: '#9b6b8a' },
              { label: 'Tone.js Synthesis', desc: 'Real-time browser-based audio rendering with per-instrument synthesis', color: '#7a4a6b' },
            ].map((step, i) => (
              <motion.div
                key={step.label}
                className="flex items-start gap-3 bg-roast/60 rounded-xl border border-roast-light/30 p-3 backdrop-blur"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              >
                <div className="w-2 h-2 rounded-full mt-1.5 flex-none" style={{ backgroundColor: step.color, boxShadow: `0 0 8px ${step.color}40` }} />
                <div>
                  <div className="text-[11px] font-bold text-cream">{step.label}</div>
                  <div className="text-[10px] text-warm-dim/60 leading-relaxed">{step.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div className="bg-roast/50 rounded-xl border border-roast-light/20 px-4 py-3 backdrop-blur" {...fadeUp}>
            <p className="text-[10px] text-warm-dim/60 font-mono leading-relaxed">
              Prompt &rarr; Local AI &rarr; JSON Composition &rarr; Tone.js &rarr; Audio
            </p>
          </motion.div>
        </motion.div>
        {/* Right side: atom animation draws here via per-slide canvas */}
        <div className="flex-1" />
      </motion.div>
    ),

    // ── 9: BENEFITS ──
    9: (
      <motion.div className="flex flex-col items-center justify-center h-full px-6" {...stagger}>
        <Eyebrow>Value</Eyebrow>
        <motion.h2 className="text-3xl md:text-5xl font-bold text-cream text-center mb-6" {...fadeUp}>
          Why <GradientText colors="#c8956c, #e8c06c, #f0e6dc">BrewBeats?</GradientText>
        </motion.h2>
        <div className="grid grid-cols-2 gap-4 max-w-3xl w-full">
          {[
            { icon: '\uD83C\uDFAF', title: 'Accessible', desc: 'No training needed \u2014 if you can describe music, you can create it. Zero barrier to entry.', color: '#c8956c' },
            { icon: '\u26A1', title: 'Instant', desc: 'Full multi-track compositions generated in seconds, not hours or days.', color: '#e8c06c' },
            { icon: '\uD83C\uDF93', title: 'Educational', desc: 'Learn music theory through AI-generated explanations of chord progressions and arrangements.', color: '#7a4a6b' },
            { icon: '\uD83C\uDF0D', title: 'Universal', desc: 'Runs in any modern browser \u2014 no installs, no plugins, works on any device.', color: '#9b6b8a' },
          ].map((b, i) => (
            <motion.div
              key={b.title}
              className="bg-roast/80 rounded-2xl border border-roast-light/50 p-6 backdrop-blur relative overflow-hidden group"
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.3 + i * 0.12, type: 'spring' as const, stiffness: 180, damping: 16 }}
              whileHover={{ y: -6, scale: 1.02, borderColor: `${b.color}44` }}
            >
              <motion.div
                className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] pointer-events-none"
                style={{ background: `radial-gradient(circle, ${b.color}, transparent 70%)` }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 4, delay: i * 0.5 }}
              />
              <span className="text-3xl block mb-3">{b.icon}</span>
              <h3 className="text-base font-bold mb-2" style={{ color: b.color }}>{b.title}</h3>
              <p className="text-[12px] text-warm-dim/70 leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    ),

    // ── 10: TECH STACK ──
    10: (
      <motion.div className="flex flex-col items-center justify-center h-full px-6" {...stagger}>
        <Eyebrow>Under the Hood</Eyebrow>
        <motion.h2 className="text-3xl md:text-5xl font-bold text-cream text-center mb-10" {...fadeUp}>
          Built with <GradientText colors="#c8956c, #e8c06c">Modern Tech</GradientText>
        </motion.h2>
        <div className="flex flex-wrap gap-3 justify-center max-w-3xl">
          {[
            { name: 'Next.js 14', desc: 'App Router, SSR, API Routes', color: '#f0e6dc' },
            { name: 'Tone.js', desc: 'Web Audio synthesis engine', color: '#c8956c' },
            { name: 'BrewBeats AI', desc: 'Local AI for music generation', color: '#76B900' },
            { name: 'Zustand', desc: 'Lightweight state management', color: '#e8c06c' },
            { name: 'Tailwind CSS', desc: 'Utility-first styling', color: '#38BDF8' },
            { name: 'Framer Motion', desc: 'Production-grade animations', color: '#FF0080' },
            { name: 'TypeScript', desc: 'Full type safety', color: '#3178C6' },
            { name: 'Canvas API', desc: 'Audio visualization', color: '#9b6b8a' },
          ].map((tech, i) => (
            <motion.div
              key={tech.name}
              className="bg-roast/80 rounded-xl border border-roast-light/50 px-5 py-3 backdrop-blur flex items-center gap-3 group hover:border-caramel/30 transition-all"
              initial={{ opacity: 0, scale: 0, rotate: (i % 2 ? 1 : -1) * 15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.15 + i * 0.08, type: 'spring' as const, stiffness: 200, damping: 14 }}
              whileHover={{ y: -3, scale: 1.05 }}
            >
              <div className="w-3 h-3 rounded-full flex-none" style={{ backgroundColor: tech.color, boxShadow: `0 0 10px ${tech.color}40` }} />
              <div>
                <div className="text-sm font-bold text-cream">{tech.name}</div>
                <div className="text-[10px] text-warm-dim/60">{tech.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <Divider />
        <motion.div className="text-center max-w-lg bg-roast/60 rounded-xl border border-roast-light/30 px-6 py-4 backdrop-blur" {...fadeUp}>
          <p className="text-[11px] text-warm-dim/70 font-mono">
            Browser &rarr; Next.js API Route &rarr; BrewBeats Local AI &rarr; Structured JSON &rarr; Tone.js Synthesis &rarr; Audio Output
          </p>
        </motion.div>
      </motion.div>
    ),

    // ── 11: INSTRUMENTS ──
    11: (
      <motion.div className="flex flex-col items-center justify-center h-full px-6 overflow-hidden" {...stagger}>
        <div className="flex flex-col items-center mb-12">
          <Eyebrow>The Studio</Eyebrow>
          <h2 className="text-4xl md:text-7xl font-bold text-cream text-center mb-4">
            <GradientText colors="#c8956c, #e8c06c, #f0e6dc">32+ Built-in</GradientText> Instruments
          </h2>
          <motion.p className="text-lg text-warm-dim/60 text-center max-w-2xl" {...fadeUp}>
            From classic grand piano to exotic AI-generated textures. <br />
            Infinite possibilities, synthesized locally in your browser.
          </motion.p>
        </div>

        {/* Marquee Container */}
        <div className="w-full relative py-10 overflow-hidden mb-12">
          {/* Fades on edges */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-espresso to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-espresso to-transparent z-10" />
          
          <motion.div 
            className="flex gap-4 whitespace-nowrap"
            animate={{ x: [0, -2000] }}
            transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
          >
            {[
              { name: 'Grand Piano', color: '#c8956c' }, { name: 'Electric Guitar', color: '#e8c06c' },
              { name: 'Upright Bass', color: '#7a4a6b' }, { name: 'Studio Drums', color: '#e85a5a' },
              { name: 'Analog Synth', color: '#9b6b8a' }, { name: 'Cinematic Strings', color: '#c89870' },
              { name: 'Jazz Trumpet', color: '#e8c06c' }, { name: 'Silver Flute', color: '#b08898' },
              { name: 'Alto Sax', color: '#d4a574' }, { name: 'Solo Violin', color: '#c8956c' },
              { name: 'Concert Cello', color: '#7a4a6b' }, { name: 'Celestial Harp', color: '#e8c5a0' },
              { name: 'Pipe Organ', color: '#9b6b8a' }, { name: 'Marimba', color: '#e8c06c' },
              { name: 'Banjo', color: '#c8956c' }, { name: 'Ukulele', color: '#d4a574' },
              { name: 'Indian Sitar', color: '#e85a5a' }, { name: 'Harmonica', color: '#b08898' },
              { name: 'Trombone', color: '#e8c06c' }, { name: 'Clarinet', color: '#7a4a6b' },
              { name: 'Kalimba', color: '#c89870' }, { name: 'Xylophone', color: '#e8c5a0' },
              { name: 'Vibraphone', color: '#9b6b8a' }, { name: 'Steel Drums', color: '#d4a574' },
              { name: 'Rhodes Piano', color: '#c8956c' }, { name: 'Accordion', color: '#b08898' },
              { name: 'French Horn', color: '#e8c06c' }, { name: 'Tuba', color: '#7a4a6b' },
              { name: 'Oboe', color: '#b08898' }, { name: 'Timpani', color: '#e85a5a' },
              { name: 'Glockenspiel', color: '#e8c5a0' }, { name: 'Celesta', color: '#9b6b8a' },
            ].concat([ // Repeat for infinite scroll effect
              { name: 'Grand Piano', color: '#c8956c' }, { name: 'Electric Guitar', color: '#e8c06c' },
              { name: 'Upright Bass', color: '#7a4a6b' }, { name: 'Studio Drums', color: '#e85a5a' },
              { name: 'Analog Synth', color: '#9b6b8a' }, { name: 'Cinematic Strings', color: '#c89870' },
              { name: 'Jazz Trumpet', color: '#e8c06c' }, { name: 'Silver Flute', color: '#b08898' },
            ]).map((inst, i) => (
              <div
                key={i}
                className="bg-roast/60 rounded-2xl border border-roast-light/30 px-6 py-4 flex items-center gap-4 hover:border-caramel/50 transition-colors cursor-default"
              >
                <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: inst.color, boxShadow: `0 0 15px ${inst.color}40` }} />
                <span className="text-xl font-bold text-cream/90">{inst.name}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center max-w-4xl">
          {[
            { label: 'Real-time Mixer', desc: 'Per-track volume & reverb' },
            { label: 'Timeline Editor', desc: 'Piano-roll note editing' },
            { label: 'WAV Export', desc: 'High-quality audio export' },
            { label: 'AI Textures', desc: 'Infinite generative sounds' },
          ].map((feat, i) => (
            <motion.div
              key={feat.label}
              className="bg-roast/40 rounded-xl border border-caramel/10 px-6 py-3 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
            >
              <div className="text-xs font-bold text-caramel uppercase tracking-widest mb-1">{feat.label}</div>
              <div className="text-[10px] text-warm-dim/50">{feat.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    ),

    // ── 12: LAUNCH STUDIO (CTA — 2nd to last) ──
    12: (
      <motion.div className="flex flex-col items-center justify-center h-full text-center px-6" {...stagger}>
        <motion.h2 className="text-5xl md:text-7xl lg:text-8xl font-black mb-4 leading-none" {...fadeUp}>
          <GradientText colors="#c8956c, #e8c06c, #f0e6dc">Start Brewing</GradientText>
        </motion.h2>
        <motion.p className="text-warm-dim text-lg mb-10 max-w-md" {...fadeUp}>
          Your studio is ready. No installs, no signups, no limits.
        </motion.p>
        <motion.button
          className="group relative px-12 py-5 rounded-full font-bold text-xl text-espresso overflow-hidden"
          onClick={handleEnter}
          style={{ background: 'linear-gradient(135deg, #c8956c, #e8c06c)' }}
          initial={{ opacity: 0, scale: 0.5, y: 40 }}
          animate={{
            opacity: 1, scale: 1, y: 0,
            boxShadow: ['0 0 30px rgba(232,192,108,0.3)', '0 0 60px rgba(232,192,108,0.6)', '0 0 30px rgba(232,192,108,0.3)'],
          }}
          transition={{
            opacity: { delay: 0.4 }, scale: { delay: 0.4, type: 'spring' as const, stiffness: 200 },
            y: { delay: 0.4 }, boxShadow: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' },
          }}
          whileHover={{ scale: 1.08, y: -3 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="relative z-10 flex items-center gap-3">
            Open Studio
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="group-hover:translate-x-1 transition-transform">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
          <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'linear', repeatDelay: 1 }}
          />
        </motion.button>
        <motion.div className="flex gap-8 mt-10 text-[10px] text-warm-dim/40 uppercase tracking-[2px]" {...fadeUp}>
          <span>Free</span><span>Browser-based</span><span>AI-Powered</span>
        </motion.div>
      </motion.div>
    ),

    // ── 13: CONCLUSION (last slide) ──
    13: (
      <motion.div className="flex flex-col items-center justify-center h-full text-center px-6 max-w-3xl mx-auto" {...stagger}>
        <motion.div className="mb-6" {...popIn}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-caramel via-gold to-dusk flex items-center justify-center shadow-lg shadow-caramel/25 mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a1210" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        </motion.div>
        <motion.h2 className="text-4xl md:text-6xl font-black mb-6 leading-none" {...fadeUp}>
          <GradientText colors="#f0e6dc, #e8c5a0, #c8956c, #e8c06c">Thank You</GradientText>
        </motion.h2>
        <Divider />
        <motion.div className="space-y-3 mb-8 text-left max-w-md w-full" {...fadeUp}>
          {[
            'Natural language prompts transformed into complete musical compositions',
            'Real-time browser-based audio synthesis powered by Tone.js',
            'BrewBeats Local AI engine generating structured, playable arrangements',
            'Professional tools: timeline editor, mixer, effects, and export',
          ].map((point, i) => (
            <motion.div key={i} className="flex items-start gap-3"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.12, ease: EASE }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-caramel mt-1.5 flex-none" />
              <p className="text-sm text-warm-dim/80 leading-relaxed">{point}</p>
            </motion.div>
          ))}
        </motion.div>
        <motion.div className="bg-roast/60 rounded-xl border border-roast-light/30 px-6 py-4 backdrop-blur" {...fadeUp}>
          <p className="text-[12px] text-cream/60 italic">
            &ldquo;Music should be for <span className="text-caramel font-semibold">everyone</span>.&rdquo;
          </p>
        </motion.div>
        <motion.p className="text-[10px] text-warm-dim/30 mt-6 uppercase tracking-[2px]" {...fadeUp}>
          Built with Next.js &bull; Tone.js &bull; BrewBeats AI &bull; Framer Motion
        </motion.p>
      </motion.div>
    ),
  };

  // ═══════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════
  return (
    <>
      {/* Exit transition overlay */}
      <AnimatePresence>
        {entered && (
          <motion.div key="exit" className="fixed inset-0 z-[200] bg-espresso"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 bg-espresso overflow-hidden" style={{ perspective: '1200px', willChange: 'transform', transform: 'translate3d(0,0,0)' }}>
        {/* ── BACKGROUND LAYER ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Antigravity particle field */}
          <canvas
            ref={particleRef}
            className="absolute inset-0"
            style={{
              willChange: 'transform',
              transform: 'translate3d(0,0,0)',
            }}
          />

          {/* Floating gradient orbs */}
          {[
            { size: 500, left: '5%', top: '10%', color: 'rgba(200,149,108,0.035)', dur: 25, dx: 80, dy: -60 },
            { size: 400, left: '65%', top: '55%', color: 'rgba(122,74,107,0.03)', dur: 30, dx: -70, dy: 90 },
            { size: 600, left: '40%', top: '75%', color: 'rgba(232,192,108,0.025)', dur: 35, dx: 100, dy: -50 },
            { size: 350, left: '80%', top: '15%', color: 'rgba(200,149,108,0.03)', dur: 28, dx: -50, dy: 70 },
          ].map((orb, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: orb.size, height: orb.size,
                left: orb.left, top: orb.top,
                background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
                filter: 'blur(50px)',
              }}
              animate={{
                x: [0, orb.dx, -orb.dx / 2, 0],
                y: [0, orb.dy, -orb.dy / 2, 0],
              }}
              transition={{ repeat: Infinity, duration: orb.dur, ease: 'linear' }}
            />
          ))}

          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: 'linear-gradient(rgba(200,149,108,1) 1px, transparent 1px), linear-gradient(90deg, rgba(200,149,108,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />

          {/* Radial ambient glow keyed to slide */}
          <motion.div
            className="absolute inset-0"
            animate={{
              background: `radial-gradient(ellipse at 50% 40%, rgba(200,149,108,${0.02 + slide * 0.004}) 0%, transparent 60%),
                           radial-gradient(ellipse at 20% 80%, rgba(122,74,107,${0.015 + (slide > 6 ? 0.01 : 0)}) 0%, transparent 50%)`,
            }}
            transition={{ duration: 1 }}
          />

          {/* Floating background icons for visual density */}
          {[
            { icon: '\u266A', x: '8%', y: '8%', size: 24, dur: 18, delay: 0 },
            { icon: '\u266B', x: '85%', y: '12%', size: 20, dur: 22, delay: 1 },
            { icon: '\u2669', x: '15%', y: '88%', size: 18, dur: 20, delay: 2 },
            { icon: '\u266C', x: '90%', y: '85%', size: 22, dur: 16, delay: 0.5 },
            { icon: '\uD83C\uDFB5', x: '45%', y: '5%', size: 16, dur: 24, delay: 3 },
            { icon: '\uD83C\uDFB6', x: '55%', y: '92%', size: 18, dur: 19, delay: 1.5 },
            { icon: '\u2615', x: '5%', y: '50%', size: 20, dur: 25, delay: 0 },
            { icon: '\u2615', x: '92%', y: '48%', size: 16, dur: 21, delay: 2.5 },
            { icon: '\u266A', x: '30%', y: '6%', size: 14, dur: 17, delay: 4 },
            { icon: '\u266B', x: '70%', y: '94%', size: 16, dur: 23, delay: 1 },
            { icon: '\uD83C\uDFB9', x: '20%', y: '95%', size: 14, dur: 20, delay: 3 },
            { icon: '\uD83E\uDD41', x: '78%', y: '7%', size: 14, dur: 18, delay: 2 },
          ].map((item, i) => (
            <motion.div
              key={`bg-icon-${i}`}
              className="absolute pointer-events-none select-none"
              style={{ left: item.x, top: item.y, fontSize: item.size }}
              animate={{
                y: [0, -15, 5, -10, 0],
                x: [0, 8, -5, 10, 0],
                rotate: [0, 5, -5, 3, 0],
                opacity: [0.06, 0.12, 0.08, 0.14, 0.06],
              }}
              transition={{ repeat: Infinity, duration: item.dur, delay: item.delay, ease: 'linear' }}
            >
              {item.icon}
            </motion.div>
          ))}
        </div>

        {/* ── PER-SLIDE DECORATION CANVAS ── */}
        <canvas
          ref={slideCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            willChange: 'transform',
            transform: 'translate3d(0,0,0)',
            zIndex: 1,
          }}
        />

        {/* ── PROGRESS BAR ── */}
        <motion.div
          className="fixed top-0 left-0 right-0 h-[2px] z-50 origin-left"
          style={{ background: 'linear-gradient(90deg, #c8956c, #e8c06c, #c8956c)' }}
          animate={{ scaleX: (slide + 1) / TOTAL }}
          transition={{ duration: 0.5 }}
        />

        {/* ── SLIDE COUNTER ── */}
        <div className="fixed top-4 left-6 z-40 text-[10px] text-warm-dim/30 font-mono">
          {String(slide + 1).padStart(2, '0')} / {TOTAL}
        </div>

        {/* ── DOT NAVIGATION ── */}
        <div className="fixed right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2.5 items-end">
          {SLIDE_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className="group relative flex items-center"
            >
              <span className="absolute right-5 text-[10px] text-cream/70 bg-roast/90 px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-roast-light/30">
                {name}
              </span>
              <motion.div
                className="w-2 h-2 rounded-full border transition-all"
                animate={{
                  backgroundColor: i === slide ? '#e8c06c' : 'transparent',
                  borderColor: i === slide ? '#e8c06c' : 'rgba(200,149,108,0.2)',
                  scale: i === slide ? 1.4 : 1,
                  boxShadow: i === slide ? '0 0 10px rgba(232,192,108,0.5)' : '0 0 0 transparent',
                }}
              />
            </button>
          ))}
        </div>

        {/* ── SLIDES ── */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide}
            className="absolute inset-0"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ transformStyle: 'preserve-3d', willChange: 'transform, opacity, filter' }}
          >
            {slides[slide]}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
