'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store/use-store';
import { getEngine, FrequencyBands } from '@/lib/audio/engine';

const BAR_COUNT = 64;
const PARTICLE_COUNT = 80;
const MAX_FLASHES = 4;

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; hue: number;
  life: number; maxLife: number;
}

interface Flash {
  alpha: number;
  hue: number;
}

// Smoothed frequency values
let sBass = 0, sMid = 0, sTreble = 0, sEnergy = 0;
let prevBass = 0, beatAccum = 0;
const barHeights = new Float32Array(BAR_COUNT);
const barTargets = new Float32Array(BAR_COUNT);

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function StudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const flashesRef = useRef<Flash[]>([]);
  const timeRef = useRef(0);
  const isPlaying = useStore((s) => s.isPlaying);
  const audioReady = useStore((s) => s.audioReady);

  const spawnParticles = useCallback((x: number, y: number, count: number, hue: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 6;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 1 + Math.random() * 3,
        alpha: 0.6 + Math.random() * 0.4,
        hue: hue + (Math.random() - 0.5) * 30,
        life: 0,
        maxLife: 30 + Math.random() * 40,
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement!.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const engine = getEngine();
      const dt = 1 / 60;
      timeRef.current += dt;
      const t = timeRef.current;

      // Audio data
      let bands: FrequencyBands = { bass: 0, mid: 0, treble: 0, energy: 0 };
      let fftData: Float32Array | null = null;
      let waveData: Float32Array | null = null;

      if (audioReady && isPlaying) {
        bands = engine.getFrequencyBands();
        fftData = engine.getFFT();
        waveData = engine.getWaveform();
      }

      // Smooth values
      const sm = isPlaying ? 0.18 : 0.04;
      sBass = lerp(sBass, bands.bass, sm);
      sMid = lerp(sMid, bands.mid, sm);
      sTreble = lerp(sTreble, bands.treble, sm);
      sEnergy = lerp(sEnergy, bands.energy, sm);

      // Beat detection
      const bassSpike = sBass - prevBass;
      prevBass = sBass;
      const isBeat = bassSpike > 0.06 && isPlaying;
      if (isBeat) beatAccum = 1;
      beatAccum *= 0.92;

      // Update bar targets from FFT
      if (fftData && fftData.length > 0) {
        const binsPerBar = Math.max(1, Math.floor(fftData.length / BAR_COUNT));
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < binsPerBar; j++) {
            const idx = i * binsPerBar + j;
            if (idx < fftData.length) {
              sum += Math.max(0, (fftData[idx] + 100) / 100);
            }
          }
          barTargets[i] = (sum / binsPerBar) * (0.5 + sEnergy * 1.5);
        }
      } else {
        for (let i = 0; i < BAR_COUNT; i++) {
          barTargets[i] = isPlaying ? 0 : (0.03 + Math.sin(t * 0.3 + i * 0.2) * 0.02);
        }
      }

      // Smooth bar heights
      for (let i = 0; i < BAR_COUNT; i++) {
        barHeights[i] = lerp(barHeights[i], barTargets[i], 0.25);
      }

      // Spawn beat particles
      if (isBeat) {
        const hue = 15 + sMid * 40;
        spawnParticles(W * (0.2 + Math.random() * 0.6), H * 0.5, 12, hue);
        if (flashesRef.current.length < MAX_FLASHES) {
          flashesRef.current.push({ alpha: 0.15 + bassSpike * 0.8, hue });
        }
      }

      // ── CLEAR ──
      ctx.clearRect(0, 0, W, H);

      // ══════════════════════════════════════════
      // LAYER 1: Deep ambient gradient
      // ══════════════════════════════════════════
      const baseHue = 15 + sMid * 35 + sTreble * 10;
      const grd = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
      grd.addColorStop(0, `hsla(${baseHue}, ${20 + sEnergy * 30}%, ${6 + sEnergy * 6}%, 0.8)`);
      grd.addColorStop(0.5, `hsla(${baseHue - 15}, ${15 + sEnergy * 15}%, ${4 + sEnergy * 3}%, 0.5)`);
      grd.addColorStop(1, 'hsla(10, 10%, 3%, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // ══════════════════════════════════════════
      // LAYER 2: FULL-SCREEN EQUALIZER BARS
      // ══════════════════════════════════════════
      const barW = W / BAR_COUNT;
      const maxBarH = H * 0.85;

      for (let i = 0; i < BAR_COUNT; i++) {
        const h = barHeights[i] * maxBarH;
        if (h < 1) continue;

        const x = i * barW;
        const normalizedPos = i / BAR_COUNT; // 0=bass, 1=treble

        // Color: bass=deep red/orange, mid=gold/amber, treble=cyan/white
        let hue: number, sat: number, lit: number;
        if (normalizedPos < 0.25) {
          hue = 0 + normalizedPos * 60; // red → orange
          sat = 70 + sEnergy * 20;
          lit = 40 + sBass * 25;
        } else if (normalizedPos < 0.55) {
          hue = 25 + (normalizedPos - 0.25) * 80; // orange → gold
          sat = 60 + sEnergy * 25;
          lit = 45 + sMid * 20;
        } else {
          hue = 170 + (normalizedPos - 0.55) * 60; // teal → cyan
          sat = 50 + sEnergy * 30;
          lit = 45 + sTreble * 25;
        }

        // Bar gradient (bottom to top)
        const barGrd = ctx.createLinearGradient(x, H, x, H - h);
        barGrd.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit}%, ${0.15 + sEnergy * 0.25})`);
        barGrd.addColorStop(0.5, `hsla(${hue}, ${sat + 10}%, ${lit + 10}%, ${0.1 + sEnergy * 0.2})`);
        barGrd.addColorStop(1, `hsla(${hue}, ${sat}%, ${lit + 20}%, ${0.03 + sEnergy * 0.08})`);

        ctx.fillStyle = barGrd;
        ctx.fillRect(x + 1, H - h, barW - 2, h);

        // Glowing top cap
        if (h > 5) {
          const capY = H - h;
          const capGlow = ctx.createRadialGradient(x + barW / 2, capY, 0, x + barW / 2, capY, barW * 2);
          capGlow.addColorStop(0, `hsla(${hue}, ${sat}%, ${lit + 30}%, ${0.2 + beatAccum * 0.3})`);
          capGlow.addColorStop(1, `hsla(${hue}, ${sat}%, ${lit}%, 0)`);
          ctx.fillStyle = capGlow;
          ctx.fillRect(x - barW, capY - barW, barW * 3, barW * 2);
        }
      }

      // Mirror bars (top, reflected — more subtle)
      for (let i = 0; i < BAR_COUNT; i++) {
        const h = barHeights[i] * maxBarH * 0.3;
        if (h < 1) continue;
        const x = i * barW;
        const normalizedPos = i / BAR_COUNT;
        const hue = normalizedPos < 0.25 ? normalizedPos * 60 : normalizedPos < 0.55 ? 25 + (normalizedPos - 0.25) * 80 : 170 + (normalizedPos - 0.55) * 60;

        const mirrorGrd = ctx.createLinearGradient(x, 0, x, h);
        mirrorGrd.addColorStop(0, `hsla(${hue}, 40%, 40%, ${0.06 + sEnergy * 0.08})`);
        mirrorGrd.addColorStop(1, `hsla(${hue}, 40%, 40%, 0)`);
        ctx.fillStyle = mirrorGrd;
        ctx.fillRect(x + 1, 0, barW - 2, h);
      }

      // ══════════════════════════════════════════
      // LAYER 3: WAVEFORM OVERLAY
      // ══════════════════════════════════════════
      if (waveData && waveData.length > 0 && sEnergy > 0.01) {
        const amplitude = 30 + sEnergy * 80;
        const step = W / waveData.length;
        const yCenter = H * 0.5;

        // Thick glow waveform
        ctx.beginPath();
        for (let i = 0; i < waveData.length; i++) {
          const x = i * step;
          const y = yCenter + waveData[i] * amplitude;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${baseHue + 10}, 60%, 60%, ${0.04 + sEnergy * 0.1})`;
        ctx.lineWidth = 3 + sEnergy * 4;
        ctx.stroke();

        // Thin bright waveform
        ctx.beginPath();
        for (let i = 0; i < waveData.length; i++) {
          const x = i * step;
          const y = yCenter + waveData[i] * amplitude;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${baseHue + 10}, 70%, 75%, ${0.06 + sEnergy * 0.12})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ══════════════════════════════════════════
      // LAYER 4: BEAT FLASH
      // ══════════════════════════════════════════
      const flashes = flashesRef.current;
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.alpha *= 0.88;
        if (f.alpha < 0.005) { flashes.splice(i, 1); continue; }

        ctx.fillStyle = `hsla(${f.hue}, 50%, 60%, ${f.alpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      // ══════════════════════════════════════════
      // LAYER 5: PARTICLES
      // ══════════════════════════════════════════
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        if (p.life > p.maxLife) { particles.splice(i, 1); continue; }

        p.vy += 0.05; // gravity
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;

        const lifeRatio = 1 - p.life / p.maxLife;
        const a = p.alpha * lifeRatio;
        const s = p.size * (0.5 + lifeRatio * 0.5);

        // Glow
        const glowR = s * 4;
        const glowGrd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        glowGrd.addColorStop(0, `hsla(${p.hue}, 70%, 65%, ${a * 0.4})`);
        glowGrd.addColorStop(1, `hsla(${p.hue}, 70%, 65%, 0)`);
        ctx.fillStyle = glowGrd;
        ctx.fillRect(p.x - glowR, p.y - glowR, glowR * 2, glowR * 2);

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${a})`;
        ctx.fill();
      }

      // Keep particle count bounded
      if (particles.length > PARTICLE_COUNT * 3) {
        particles.splice(0, particles.length - PARTICLE_COUNT * 2);
      }

      // ══════════════════════════════════════════
      // IDLE: Subtle breathing glow when not playing
      // ══════════════════════════════════════════
      if (!isPlaying) {
        const pulse = 0.5 + Math.sin(t * 0.4) * 0.5;
        // Gentle idle bars
        for (let i = 0; i < BAR_COUNT; i++) {
          const idleH = (3 + Math.sin(t * 0.5 + i * 0.3) * 2) * (0.5 + pulse * 0.5);
          const x = i * barW;
          ctx.fillStyle = `rgba(200, 149, 108, ${0.03 + pulse * 0.02})`;
          ctx.fillRect(x + 1, H - idleH, barW - 2, idleH);
        }

        const idleGrd = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.35);
        idleGrd.addColorStop(0, `rgba(200, 149, 108, ${0.015 + pulse * 0.015})`);
        idleGrd.addColorStop(1, 'rgba(200, 149, 108, 0)');
        ctx.fillStyle = idleGrd;
        ctx.fillRect(0, 0, W, H);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying, audioReady, spawnParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="studio-viz"
    />
  );
}
