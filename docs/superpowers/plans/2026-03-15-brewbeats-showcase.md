# BrewBeats Showcase Website — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single self-contained HTML file (`showcase.html`) that presents BrewBeats as a cinematic, presentation-grade showcase to impress college decision-makers and potential funders.

**Architecture:** Single HTML file with inlined `<style>` and `<script>` blocks. 11 scroll-snap sections acting as slides. JS handles: canvas waveform, particle generation, intersection observer reveals, typewriter effects, counter animations, keyboard/scroll navigation. CSS handles: all transitions, keyframe animations, frosted glass, gradients, responsive layout.

**Tech Stack:** Vanilla HTML5, CSS3 (scroll-snap, backdrop-filter, clip-path, custom properties), Vanilla JS (Canvas API, Intersection Observer, requestAnimationFrame)

**Spec:** `docs/superpowers/specs/2026-03-15-brewbeats-showcase-design.md`

---

## File Structure

- **Create:** `showcase.html` (project root) — the entire deliverable, single file

No other files created or modified. The existing BrewBeats app is untouched.

---

## Chunk 1: Foundation — Shell, Navigation, Global Systems

### Task 1: HTML Shell + CSS Reset + Color System + Typography

**Files:**
- Create: `showcase.html`

- [ ] **Step 1: Create the HTML document shell**

Write the complete `<!DOCTYPE html>` document with:
- `<html lang="en">`, viewport meta, title "BrewBeats — AI Music Studio"
- `<style>` block with CSS custom properties for the full color system:
  ```
  --black: #0a0908; --espresso: #1a1210; --roast: #2a1f1a;
  --roast-light: #3a2d25; --caramel: #c8956c; --cream: #e8c5a0;
  --gold: #e8c06c; --dusk: #7a4a6b; --dusk-light: #9b6b8a;
  --warm-white: #f0e6dc; --warm-dim: #b0a090;
  ```
- CSS reset: `*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }`
- `html, body` — full height, `background: var(--black)`, `color: var(--cream)`, font stack: `system-ui, -apple-system, 'Segoe UI', sans-serif`, `overflow-x: hidden`
- Typography base: headings bold, letter-spacing `-0.02em` to `-0.04em`, body line-height 1.65
- `scroll-snap-type: y mandatory` on body/main container
- `<main>` container with 11 empty `<section>` elements, each `class="slide"` with unique `id="slide-1"` through `id="slide-11"`
- `.slide` base: `min-height: 100vh; scroll-snap-align: start; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;`
- Each `.slide` gets `role="tabpanel"` and `aria-label="Slide N: Title"`
- `prefers-reduced-motion` media query wrapping all animation/transition rules
- **JS-disabled safety:** Use `html.js-enabled [data-reveal] { opacity:0; ... }` pattern. JS adds `js-enabled` class to `<html>` on load. Without JS, reveals stay visible.
- **Canvas fallback:** `#hero-canvas` parent gets `background: radial-gradient(ellipse at center, rgba(200,149,108,0.15), transparent 70%)` as static fallback behind the canvas

- [ ] **Step 2: Verify shell opens in browser**

Open `showcase.html` in browser. Expect: black page, no errors in console, scroll-snap works between empty sections.

### Task 2: Side Navigation Dots + Section Counter + Keyboard Nav

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add nav dots HTML**

After `<main>`, add:
```html
<nav class="slide-nav" role="tablist" aria-label="Slide navigation">
  <!-- JS generates 11 dots -->
</nav>
<div class="slide-counter"><span id="current-slide">1</span> / 11</div>
```

- [ ] **Step 2: Style nav dots**

```css
.slide-nav { position: fixed; right: 24px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 12px; z-index: 100; }
.slide-nav .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--roast-light); border: 1px solid var(--warm-dim); cursor: pointer; transition: all 0.3s ease; }
.slide-nav .dot.active { background: var(--caramel); border-color: var(--caramel); box-shadow: 0 0 8px rgba(200,149,108,0.5); transform: scale(1.3); }
.slide-counter { position: fixed; right: 20px; bottom: 24px; font-size: 13px; color: var(--warm-dim); z-index: 100; font-variant-numeric: tabular-nums; }
```

- [ ] **Step 3: Write navigation JS**

In `<script>` at end of body:
- Generate 11 dots dynamically into `.slide-nav`, each `role="tab"` with `aria-selected` and `aria-label="Slide N"`
- Intersection Observer on each `.slide` (`threshold: 0.5`) — updates active dot and counter
- Dot click → `section.scrollIntoView({ behavior: 'smooth' })`
- Keyboard: ArrowDown/PageDown → next slide, ArrowUp/PageUp → prev slide (using `scrollIntoView`)
- Track `currentSlide` index variable

- [ ] **Step 4: Verify navigation works**

Open browser. Expect: dots visible on right edge, clicking scrolls to section, keyboard arrows work, active dot highlights, counter updates.

### Task 3: Scroll Progress Waveform Bar

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add progress bar HTML**

At top of body:
```html
<div class="progress-bar">
  <svg viewBox="0 0 1000 8" preserveAspectRatio="none">
    <path id="progress-wave" d="..." stroke="var(--caramel)" stroke-width="3" fill="none"/>
  </svg>
</div>
```
The SVG `d` attribute is a hand-drawn waveform path spanning 1000 units wide.

- [ ] **Step 2: Style + animate progress bar**

```css
.progress-bar { position: fixed; top: 0; left: 0; width: 100%; height: 4px; z-index: 101; }
.progress-bar svg { width: 100%; height: 100%; }
#progress-wave { stroke-dasharray: <total-length>; stroke-dashoffset: <total-length>; transition: stroke-dashoffset 0.2s ease; filter: drop-shadow(0 0 4px rgba(232,192,108,0.5)); }
```

- [ ] **Step 3: JS scroll handler for progress**

On `scroll` event (throttled via `requestAnimationFrame`):
- Calculate scroll percentage: `scrollTop / (scrollHeight - clientHeight)`
- Set `stroke-dashoffset` = totalLength * (1 - percentage)

- [ ] **Step 4: Verify progress bar**

Scroll through page. Expect: waveform-shaped bar fills from left to right as you scroll.

### Task 4: Staggered Reveal System (Intersection Observer)

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add reveal CSS**

```css
[data-reveal] { opacity: 0; transform: translateY(30px); transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
[data-reveal].revealed { opacity: 1; transform: translateY(0); }
/* Stagger delays applied via inline style or CSS nth-child */
```

- [ ] **Step 2: Add reveal observer JS**

```js
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); } });
}, { threshold: 0.2 });
document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));
```

- [ ] **Step 3: Verify with placeholder content**

Add a test `data-reveal` element in slide 1. Scroll to it. Expect: fades in and slides up.

### Task 5: Magnetic Cursor Glow + Morphing Gradient Blobs

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add cursor glow overlay**

```html
<div class="cursor-glow"></div>
```
```css
.cursor-glow { position: fixed; inset: 0; pointer-events: none; z-index: 1; background: radial-gradient(circle 400px at var(--mx, 50%) var(--my, 50%), rgba(200,149,108,0.06), transparent 60%); }
```
JS: `document.addEventListener('mousemove', e => { document.documentElement.style.setProperty('--mx', e.clientX+'px'); document.documentElement.style.setProperty('--my', e.clientY+'px'); });`

- [ ] **Step 2: Add morphing gradient blobs**

Inside `<main>`, fixed position:
```html
<div class="blob blob-1"></div>
<div class="blob blob-2"></div>
```
```css
.blob { position: fixed; width: 50vw; height: 50vw; border-radius: 50%; filter: blur(100px); opacity: 0.15; pointer-events: none; z-index: 0; }
.blob-1 { background: var(--caramel); top: -10%; left: -10%; animation: blob1 20s ease-in-out infinite; }
.blob-2 { background: var(--dusk); bottom: -10%; right: -10%; animation: blob2 25s ease-in-out infinite; }
@keyframes blob1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(20vw,15vh) scale(1.2); } 66% { transform: translate(-10vw,25vh) scale(0.9); } }
@keyframes blob2 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-15vw,-10vh) scale(1.1); } 66% { transform: translate(10vw,-20vh) scale(1.3); } }
```

- [ ] **Step 3: Verify ambient effects**

Open browser. Expect: subtle glow follows cursor, colored blobs drift slowly in background.

### Task 6: Particle System (JS-generated)

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add particle container + CSS keyframes**

```html
<div class="particles" id="particles"></div>
```
```css
.particles { position: fixed; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }
.particle { position: absolute; border-radius: 50%; }
@keyframes drift1 { 0% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-30vh) translateX(15px); } 100% { transform: translateY(-60vh) translateX(-10px); } }
@keyframes drift2 { 0% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-25vh) translateX(-20px); } 100% { transform: translateY(-55vh) translateX(10px); } }
@keyframes drift3 { 0% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-35vh) translateX(10px); } 100% { transform: translateY(-70vh) translateX(-15px); } }
```

- [ ] **Step 2: JS particle generator**

On `DOMContentLoaded`:
```js
const colors = ['var(--caramel)','var(--gold)','var(--dusk)','var(--warm-white)'];
const container = document.getElementById('particles');
for (let i = 0; i < 80; i++) {
  const p = document.createElement('div');
  p.className = 'particle';
  const layer = i % 3; // 0=far, 1=mid, 2=near
  const size = [2, 3, 4][layer];
  const opacity = [0.12, 0.2, 0.35][layer];
  const dur = (15 + Math.random() * 25).toFixed(1);
  const drift = `drift${layer+1}`;
  Object.assign(p.style, {
    width: size+'px', height: size+'px',
    background: colors[Math.floor(Math.random()*colors.length)],
    opacity: opacity,
    left: Math.random()*100+'%', top: (50+Math.random()*60)+'%',
    animation: `${drift} ${dur}s ease-in-out infinite`,
    animationDelay: -(Math.random()*20).toFixed(1)+'s'
  });
  container.appendChild(p);
}
```

- [ ] **Step 3: Verify particles**

Open browser. Expect: small dots drifting upward at varying speeds and opacities across the page.

---

## Chunk 2: Slides 1-4 — Hero, Problem, Solution, Prompt Feature

### Task 7: Slide 1 — Hero with Canvas Waveform + Glitch Title + Typewriter

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add hero HTML content inside `#slide-1`**

```html
<canvas id="hero-canvas"></canvas>
<div class="hero-content" style="position:relative; z-index:2; text-align:center;">
  <h1 class="hero-title glitch" data-text="BrewBeats">BrewBeats</h1>
  <p class="hero-subtitle"><span id="typewriter-1"></span><span class="cursor">|</span></p>
  <p class="hero-tagline" data-reveal style="transition-delay:2s">Describe it. Hear it. Own it.</p>
  <div class="scroll-cta" data-reveal style="transition-delay:2.5s">
    <div class="glow-ring"></div>
    <div class="glow-ring" style="animation-delay:0.5s"></div>
    <svg><!-- down arrow --></svg>
  </div>
</div>
```

- [ ] **Step 2: Add hero CSS — glitch effect, typewriter cursor, glow rings, canvas**

Full CSS for:
- `#hero-canvas`: absolute, fills section, z-index 0
- `.hero-title`: clamp(3rem, 8vw, 7rem), bold, warm-white
- `.glitch` animation: 0.5s on load, clip-path slices + translate offsets + color channel shadows
- `.cursor`: caramel, blinks at 530ms via `@keyframes blink`
- `.glow-ring`: concentric expanding rings, caramel, scale 1→2.5, opacity 0.6→0
- `.scroll-cta`: bouncing animation (translateY)

- [ ] **Step 3: Add canvas waveform JS**

```js
function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = canvas.offsetWidth * dpr; canvas.height = canvas.offsetHeight * dpr; }
  function draw(t) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // Draw 4 sine waves with varying frequency, amplitude, phase, color
    const waves = [
      { freq: 0.008, amp: 40, phase: t*0.001, color: 'rgba(200,149,108,0.3)' },
      { freq: 0.012, amp: 25, phase: t*0.0015+1, color: 'rgba(232,192,108,0.25)' },
      { freq: 0.006, amp: 55, phase: t*0.0008+2, color: 'rgba(122,74,107,0.2)' },
      { freq: 0.015, amp: 18, phase: t*0.002+3, color: 'rgba(240,230,220,0.15)' },
    ];
    waves.forEach(w => { /* draw sine wave path */ });
    if (heroVisible) requestAnimationFrame(draw);
  }
  resize(); window.addEventListener('resize', resize);
  requestAnimationFrame(draw);
}
```

- [ ] **Step 4: Add typewriter JS**

```js
function typeWriter(elementId, text, speed = 60) {
  return new Promise(resolve => {
    const el = document.getElementById(elementId);
    let i = 0;
    const interval = setInterval(() => {
      el.textContent += text[i]; i++;
      if (i >= text.length) { clearInterval(interval); setTimeout(resolve, 500); }
    }, speed);
  });
}
// Trigger on page load after glitch settles
setTimeout(() => typeWriter('typewriter-1', 'AI-Powered Music Studio'), 800);
```

- [ ] **Step 5: Verify hero slide**

Open browser. Expect: animated waveform background, "BrewBeats" glitches then settles, subtitle types out, tagline fades in, arrow bounces with glow rings.

### Task 8: Slide 2 — The Problem (3 Frosted Glass Cards)

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add problem slide HTML inside `#slide-2`**

```html
<div class="slide-inner">
  <h2 data-reveal>The Problem</h2>
  <div class="problem-cards">
    <div class="glass-card card-fly-left" data-reveal style="transition-delay:0.2s">
      <svg class="draw-icon" viewBox="0 0 24 24" fill="none" stroke="var(--caramel)" stroke-width="1.5"><!-- keyboard icon: rect + 3 rows of keys --><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="8" y2="10"/><line x1="11" y1="10" x2="13" y2="10"/><line x1="16" y1="10" x2="18" y2="10"/><line x1="7" y1="14" x2="17" y2="14"/></svg>
      <h3>Expensive</h3>
      <p>Professional DAW software costs hundreds. Plugins cost more.</p>
    </div>
    <div class="glass-card card-fly-up" data-reveal style="transition-delay:0.5s">
      <svg class="draw-icon"><!-- clock icon --></svg>
      <h3>Complex</h3>
      <p>Months to learn. Years to master. Most people give up.</p>
    </div>
    <div class="glass-card card-fly-right" data-reveal style="transition-delay:0.8s">
      <svg class="draw-icon"><!-- lock icon --></svg>
      <h3>Inaccessible</h3>
      <p>Music creation locked behind technical barriers.</p>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add CSS for glass cards + directional fly-in animations**

```css
.glass-card { background: rgba(42,31,26,0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(200,149,108,0.15); border-radius: 16px; padding: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.card-fly-left { transform: translateX(-60px) translateY(30px); }
.card-fly-left.revealed { transform: translateX(0) translateY(0); }
.card-fly-up { transform: translateY(60px); }
.card-fly-up.revealed { transform: translateY(0); }
.card-fly-right { transform: translateX(60px) translateY(30px); }
.card-fly-right.revealed { transform: translateX(0) translateY(0); }
.problem-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 900px; }
```

- [ ] **Step 3: Add SVG icon draw animation CSS**

```css
.draw-icon path { stroke-dasharray: 100; stroke-dashoffset: 100; transition: stroke-dashoffset 1s ease 0.5s; }
.revealed .draw-icon path { stroke-dashoffset: 0; }
```

- [ ] **Step 4: Add animated diagonal background lines**

```css
#slide-2 { background: var(--espresso); }
#slide-2::before { content:''; position:absolute; inset:0; background: repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(200,149,108,0.03) 40px, rgba(200,149,108,0.03) 41px); animation: slideLines 20s linear infinite; }
@keyframes slideLines { to { background-position: 60px 60px; } }
```

- [ ] **Step 5: Verify problem slide**

Scroll to slide 2. Expect: 3 glass cards fly in from different directions, icons draw themselves, diagonal lines move slowly in background.

### Task 9: Slide 3 — The Solution (Dramatic Reveal)

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add solution slide HTML inside `#slide-3`**

```html
<div class="golden-burst"></div>
<div class="slide-inner" style="text-align:center; position:relative; z-index:2;">
  <p class="solution-lead" data-reveal>What if you could just...</p>
  <p class="solution-highlight"><span id="typewriter-2"></span><span class="cursor">|</span></p>
  <div class="logo-reveal" data-reveal style="transition-delay:1.5s">
    <svg><!-- BrewBeats logo: gradient badge + music note --></svg>
  </div>
  <p class="solution-tagline" data-reveal style="transition-delay:2s">
    BrewBeats turns your words into music.
    <span class="underline-draw"></span>
  </p>
</div>
```

- [ ] **Step 2: Add CSS for golden burst, logo scale-rotate, underline draw**

- `.golden-burst`: radial-gradient from gold to transparent, `scale(0)` → `scale(1)` on section enter, centered
- `.logo-reveal svg`: `scale(0) rotate(-180deg)` → `scale(1) rotate(0)` on `.revealed`
- `.underline-draw`: caramel pseudo-element, `scaleX(0)` → `scaleX(1)`, `transform-origin: left`
- Typewriter triggered by intersection observer on this slide

- [ ] **Step 3: Add slide 3 intersection trigger for typewriter**

JS: When slide 3 enters viewport, call `typeWriter('typewriter-2', 'describe it?', 80)` with golden burst scale animation.

- [ ] **Step 4: Verify solution slide**

Scroll to slide 3. Expect: "What if you could just..." fades in, "describe it?" types out, golden light expands, logo spins in, tagline with drawn underline appears.

### Task 10: Slide 4 — Feature: Prompt-to-Music (Animated Chat Mockup)

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add prompt feature HTML inside `#slide-4`**

Split layout:
```html
<div class="slide-inner split-layout">
  <div class="chat-mockup" data-reveal>
    <div class="chat-container">
      <div class="chat-msg user" id="chat-user-msg"></div>
      <div class="chat-msg assistant" id="chat-assistant-msg" style="display:none">
        <div class="comp-card">
          <h4>Midnight Study Session</h4>
          <div class="track-list">
            <span class="track-pill" style="--delay:0.2s">Piano</span>
            <span class="track-pill" style="--delay:0.4s">Drums</span>
            <span class="track-pill" style="--delay:0.6s">Bass</span>
          </div>
        </div>
      </div>
    </div>
    <div class="genre-pills">
      <span class="genre-pill" data-reveal style="transition-delay:2.5s">Lo-Fi</span>
      <span class="genre-pill" data-reveal style="transition-delay:2.7s">Jazz</span>
      <span class="genre-pill" data-reveal style="transition-delay:2.9s">Hip-Hop</span>
    </div>
  </div>
  <div class="feature-desc" data-reveal style="transition-delay:0.3s">
    <h2>Prompt-to-Music</h2>
    <p>Describe the music you want in plain English. BrewBeats understands your vision.</p>
    <ul>
      <li data-reveal style="transition-delay:0.5s">Natural language input</li>
      <li data-reveal style="transition-delay:0.7s">Iterative editing via conversation</li>
      <li data-reveal style="transition-delay:0.9s">8 genre presets to jumpstart ideas</li>
    </ul>
  </div>
</div>
```

- [ ] **Step 2: Add chat mockup CSS**

- `.chat-container`: `background: #1a1210`, `border-radius: 12px`, `padding: 20px`, `border: 1px solid #3a2d25`
- `.chat-msg.user`: right-aligned bubble, caramel background at 20%
- `.chat-msg.assistant`: left-aligned, roast background
- `.comp-card`: glass card styling, smaller
- `.track-pill`: small rounded pill, colored border, appears with scale+fade
- `.genre-pill`: floating pills with subtle bounce keyframe
- `.split-layout`: `display: grid; grid-template-columns: 55% 45%; gap: 40px; align-items: center;`

- [ ] **Step 3: Add chat animation JS**

On slide 4 enter:
1. Type user message into `#chat-user-msg`: "Create a chill lo-fi beat with piano and soft drums"
2. After 500ms pause, show assistant response (slide up animation)
3. Cascade track pills in comp card
4. Genre pills float in via `data-reveal`

- [ ] **Step 4: Verify chat mockup**

Scroll to slide 4. Expect: chat types, response slides up, composition card appears with cascading tracks, genre pills float in. Right side: feature description fades in with staggered bullets.

---

## Chunk 3: Slides 5-8 — Timeline, Mixer, How It Works, Tech Stack

### Task 11: Slide 5 — Feature: Timeline Editor (Animated Piano Roll)

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add timeline slide HTML inside `#slide-5`**

```html
<div class="slide-inner" style="width:100%; max-width:1000px;">
  <div class="piano-roll" data-reveal>
    <div class="track-labels">
      <span data-reveal style="transition-delay:0.1s">Piano</span>
      <span data-reveal style="transition-delay:0.2s">Drums</span>
      <span data-reveal style="transition-delay:0.3s">Bass</span>
      <span data-reveal style="transition-delay:0.4s">Synth</span>
    </div>
    <div class="grid" id="piano-grid">
      <!-- 4 rows x 16 columns, JS fills notes -->
      <div class="playhead" id="playhead"></div>
    </div>
  </div>
  <div class="feature-desc-center" data-reveal style="transition-delay:1.5s">
    <h2>Visual Timeline Editor</h2>
    <p>Click to edit. Zoom to explore. Every note, color-coded by instrument.</p>
  </div>
</div>
```

- [ ] **Step 2: Add piano roll CSS**

- `.piano-roll`: glass card, overflow hidden
- `.grid`: CSS grid `16 columns x 4 rows`, cell size ~40px, border `1px solid var(--roast-light)`
- `.grid .note`: positioned absolutely within cell, colored by track, `border-radius: 4px`
- `.note` enter animation: `@keyframes noteDrop { from { transform: translateY(-20px); opacity:0; } to { transform: translateY(0); opacity:1; } }` with bounce
- `.playhead`: absolute, caramel vertical line, `animation: sweep 4s linear infinite`
- `@keyframes sweep { from { left:0; } to { left:100%; } }`
- Zoom pulse: `animation: gridZoom 6s ease-in-out infinite` — scale 1→1.03→1

- [ ] **Step 3: Add note drop JS**

On slide 5 enter:
- Define ~12 note positions: `[{row:0,col:0},{row:0,col:4},{row:1,col:2},...] `
- Color map: row 0=caramel, 1=gold, 2=dusk, 3=cream
- Drop notes one by one with 80ms stagger, each with `noteDrop` animation

- [ ] **Step 4: Verify timeline slide**

Scroll to slide 5. Expect: track labels slide in, notes drop into grid with bounce, playhead sweeps across, grid subtly pulses zoom.

### Task 12: Slide 6 — Feature: Mixer & Visualizer

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add mixer slide HTML inside `#slide-6`**

```html
<div class="viz-bars" id="viz-bars"><!-- JS generates 20 bars --></div>
<div class="slide-inner" style="position:relative; z-index:2;">
  <div class="mixer-strip" data-reveal>
    <div class="mixer-channel" data-reveal style="transition-delay:0.2s">
      <span class="ch-label">Piano</span>
      <div class="fader-track"><div class="fader" style="--target:72%"></div></div>
      <div class="ch-buttons"><button class="btn-m">M</button><button class="btn-s">S</button></div>
    </div>
    <!-- 3 more channels: Drums (85%), Bass (65%), Synth (55%) -->
  </div>
  <svg class="mixer-waveform" viewBox="0 0 400 30" data-reveal style="transition-delay:1s">
    <path d="M0,15 Q20,5 40,15 T80,15 T120,15 T160,15 T200,15 T240,15 T280,15 T320,15 T360,15 T400,15" stroke="var(--caramel)" stroke-width="1.5" fill="none" opacity="0.4" stroke-dasharray="500" stroke-dashoffset="500"/>
  </svg>
  <div class="glass-card mixer-desc" data-reveal style="transition-delay:1.2s">
    <h2>Professional Mixer</h2>
    <p>Per-track volume, reverb, delay. Mute & solo. Real-time visualizer.</p>
  </div>
</div>
```

- [ ] **Step 2: Add mixer + visualizer CSS**

- `.mixer-strip`: flex row, gap 16px, centered
- `.mixer-channel`: glass card, flex column, align center
- `.fader-track`: 6px wide, 120px tall, vertical, `background: var(--roast-light)`, `border-radius: 3px`
- `.fader`: absolute bottom, caramel, `width:100%`, `height:0` → `height: var(--target)` on `.revealed`, `transition: height 1s ease`
- `.btn-m, .btn-s`: small square buttons, `border: 1px solid var(--roast-light)`, flash animation
- `.mixer-waveform`: `width:100%; margin-top:12px;` — on `.revealed`, `stroke-dashoffset` transitions to 0 over 1.5s
- `.viz-bars`: absolute, bottom 0, width 100%, flex row, justify space-around
- `.viz-bar`: width 3%, `background: linear-gradient(to top, var(--dusk), var(--caramel), var(--gold))`, opacity 0.15
- Each bar: `animation: barPulse Xs ease-in-out infinite` with random X from 0.4-1.2s
- `@keyframes barPulse { 0%,100% { height:10%; } 50% { height: Y%; } }` — random Y per bar

- [ ] **Step 3: Add visualizer bar JS generation**

On `DOMContentLoaded`:
```js
const vizContainer = document.getElementById('viz-bars');
for (let i = 0; i < 20; i++) {
  const bar = document.createElement('div');
  bar.className = 'viz-bar';
  bar.style.animationDuration = (0.4 + Math.random()*0.8).toFixed(2) + 's';
  bar.style.height = (10 + Math.random()*40) + '%';
  vizContainer.appendChild(bar);
}
```

- [ ] **Step 4: Verify mixer slide**

Scroll to slide 6. Expect: visualizer bars pulse in background, mixer channels appear with faders sliding up, M/S buttons visible, description card overlays.

### Task 13: Slide 7 — How It Works (4-Step Flow)

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add how-it-works HTML inside `#slide-7`**

```html
<div class="slide-inner">
  <h2 data-reveal>How It Works</h2>
  <div class="steps-flow">
    <svg class="connecting-line" id="connect-line">
      <line x1="12.5%" y1="50%" x2="87.5%" y2="50%" stroke="var(--caramel)" stroke-width="2" stroke-dasharray="500" stroke-dashoffset="500"/>
    </svg>
    <div class="step" data-reveal style="transition-delay:0.3s">
      <div class="step-circle"><div class="ring-spin"></div><svg><!-- keyboard icon --></svg></div>
      <h3>Type</h3>
      <p>Describe your music in plain language</p>
    </div>
    <div class="step" data-reveal style="transition-delay:0.7s">
      <div class="step-circle"><div class="ring-spin"></div><svg><!-- sparkle/brain icon --></svg></div>
      <h3>Generate</h3>
      <p>AI composes a multi-track piece</p>
    </div>
    <div class="step" data-reveal style="transition-delay:1.1s">
      <div class="step-circle"><div class="ring-spin"></div><svg><!-- sliders icon --></svg></div>
      <h3>Edit</h3>
      <p>Fine-tune with timeline, mixer & chat</p>
    </div>
    <div class="step" data-reveal style="transition-delay:1.5s">
      <div class="step-circle"><div class="ring-spin"></div><svg><!-- download icon --></svg></div>
      <h3>Export</h3>
      <p>Download as WAV, share anywhere</p>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add steps CSS**

- `.steps-flow`: grid 4 columns, relative, max-width 800px
- `.step`: text-align center, flex column, align center
- `.step-circle`: 72px circle, `border: 2px solid var(--roast-light)`, flex center
- `.ring-spin`: absolute, full size, `border: 2px solid transparent; border-top-color: var(--caramel);`, `animation: spin 1.5s linear infinite`, opacity 0 → 1 on `.revealed`
- `.connecting-line`: absolute, width 100%, top 36px (center of circles)
- Line: `stroke-dashoffset: 500` → `0` transition 1.5s triggered by observer on slide 7

- [ ] **Step 3: Add connecting line animation JS**

On slide 7 enter: select the `<line>` element, transition `stroke-dashoffset` to 0.

- [ ] **Step 4: Verify how-it-works slide**

Scroll to slide 7. Expect: steps reveal left-to-right with stagger, rings spin on reveal, connecting line draws between them.

### Task 14: Slide 8 — Tech Stack (Hex Grid + Counters)

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add tech stack HTML inside `#slide-8`**

```html
<div class="circuit-bg"></div>
<div class="slide-inner" style="position:relative; z-index:2;">
  <h2 data-reveal>Built With</h2>
  <div class="hex-grid">
    <div class="hex" data-reveal style="transition-delay:0.2s"><span>Next.js</span></div>
    <div class="hex" data-reveal style="transition-delay:0.4s"><span>Tone.js</span></div>
    <div class="hex" data-reveal style="transition-delay:0.6s"><span>Zustand</span></div>
    <div class="hex" data-reveal style="transition-delay:0.8s"><span>Tailwind</span></div>
    <div class="hex" data-reveal style="transition-delay:1.0s"><span>Framer Motion</span></div>
    <div class="hex" data-reveal style="transition-delay:1.2s"><span>AI / LLM</span></div>
  </div>
  <div class="stats-row">
    <div class="stat" data-reveal style="transition-delay:1.4s">
      <span class="stat-num" data-count="50">0</span><span class="stat-plus">+</span>
      <span class="stat-label">Instruments</span>
    </div>
    <div class="stat" data-reveal style="transition-delay:1.6s">
      <span class="stat-num" data-count="8">0</span>
      <span class="stat-label">Genre Presets</span>
    </div>
    <div class="stat" data-reveal style="transition-delay:1.8s">
      <span class="stat-label-only">Real-time Synthesis</span>
    </div>
    <div class="stat" data-reveal style="transition-delay:2.0s">
      <span class="stat-label-only">WAV Export</span>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add hex grid CSS**

```css
.hex-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; max-width: 500px; margin: 40px auto; }
.hex { width: 120px; height: 120px; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); background: var(--roast); border: none; display: flex; align-items: center; justify-content: center; position: relative; animation: hexFloat 4s ease-in-out infinite; }
.hex::before { content:''; position:absolute; inset:-2px; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); background: linear-gradient(135deg, var(--caramel), var(--gold), var(--dusk)); z-index:-1; }
@keyframes hexFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
```

- [ ] **Step 3: Add counter animation JS**

```js
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    let current = 0;
    const duration = 1500;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      current = Math.round(target * eased);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}
```
Trigger `animateCounters()` on slide 8 intersection enter.

- [ ] **Step 4: Add circuit board background CSS**

```css
.circuit-bg { position:absolute; inset:0; background-image: url("data:image/svg+xml,..."); /* inline SVG circuit pattern */ opacity: 0.04; animation: circuitCrawl 30s linear infinite; }
@keyframes circuitCrawl { to { stroke-dashoffset: -200; } }
```

- [ ] **Step 5: Verify tech stack slide**

Scroll to slide 8. Expect: hexagons appear with stagger and float, counters animate 0→50 and 0→8, circuit pattern subtly animates in background.

---

## Chunk 4: Slides 9-11 — Vision, Conclusion, Thank You + Polish

### Task 15: Slide 9 — Vision / Roadmap (Vertical Timeline)

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add roadmap HTML inside `#slide-9`**

```html
<div class="starfield" id="starfield"></div>
<div class="slide-inner" style="position:relative; z-index:2;">
  <h2 data-reveal>The Vision</h2>
  <div class="roadmap">
    <svg class="roadmap-line"><line x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--caramel)" stroke-width="2" stroke-dasharray="400" stroke-dashoffset="400"/></svg>
    <div class="milestone left" data-reveal style="transition-delay:0.3s">
      <div class="node active"></div>
      <div class="milestone-card glass-card"><h3>Now</h3><p>Browser-based AI music studio</p></div>
    </div>
    <div class="milestone right" data-reveal style="transition-delay:0.6s">
      <div class="node"></div>
      <div class="milestone-card glass-card"><h3>Next</h3><p>Mobile app & touch interface</p></div>
    </div>
    <div class="milestone left" data-reveal style="transition-delay:0.9s">
      <div class="node"></div>
      <div class="milestone-card glass-card"><h3>Future</h3><p>Real-time collaboration</p></div>
    </div>
    <div class="milestone right" data-reveal style="transition-delay:1.2s">
      <div class="node"></div>
      <div class="milestone-card glass-card"><h3>Vision</h3><p>Plugin marketplace & MIDI export</p></div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add roadmap CSS**

- `.roadmap`: relative, max-width 600px, margin auto
- `.milestone`: relative, padding 20px, `display: flex`, alternating via `.left` / `.right`
- `.node`: 16px circle, `border: 2px solid var(--caramel)`, centered on the line
- `.node.active`: filled caramel, `box-shadow: 0 0 12px var(--gold)`, pulsing glow keyframe
- `.roadmap-line`: absolute, centered, full height, `stroke-dashoffset` transitions on slide enter

- [ ] **Step 3: Add starfield JS generation**

On `DOMContentLoaded`, generate 80 star positions as a single `box-shadow` value on one `.starfield::after` element. Add subtle twinkle via `animation: twinkle 3s ease-in-out infinite alternate` with random delays.

- [ ] **Step 4: Verify roadmap slide**

Scroll to slide 9. Expect: starfield twinkles, vertical line draws down, milestone cards appear alternating left/right, "Now" node pulses golden.

### Task 16: Slide 10 — Conclusion (Summary Cards + Impact Statement)

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add conclusion HTML inside `#slide-10`**

```html
<div class="slide-inner" style="text-align:center;">
  <h2 data-reveal>In Summary</h2>
  <div class="summary-cards">
    <div class="glass-card summary" data-reveal style="transition-delay:0.3s">
      <h3>The Problem</h3>
      <p>Music creation is locked behind complexity and cost</p>
    </div>
    <div class="glass-card summary" data-reveal style="transition-delay:0.6s">
      <h3>What We Built</h3>
      <p>A conversational AI studio that runs in your browser</p>
    </div>
    <div class="glass-card summary" data-reveal style="transition-delay:0.9s">
      <h3>What's Next</h3>
      <p>A platform that democratizes music creation for everyone</p>
    </div>
  </div>
  <div class="impact" data-reveal style="transition-delay:1.5s">
    <hr class="gold-rule draw-rule">
    <p class="impact-text">We're not just building a tool. We're opening a door.</p>
    <hr class="gold-rule draw-rule">
  </div>
</div>
```

- [ ] **Step 2: Add conclusion CSS**

- `.summary-cards`: grid 3 columns, gap 24px
- `.summary`: hover with 3D tilt (3D tilt JS is defined in Task 18 Step 3 — it applies to all `.glass-card` elements globally, so it will cover these cards once Task 18 is complete)
- `.impact-text`: `font-size: clamp(1.2rem, 3vw, 1.8rem)`, italic, warm-white
- `.gold-rule`: `height: 2px`, `background: var(--gold)`, `scaleX(0)` → `scaleX(1)` on `.revealed`

- [ ] **Step 3: Verify conclusion slide**

Scroll to slide 10. Expect: 3 summary cards rise from bottom, golden rules draw themselves, impact quote fades in.

### Task 17: Slide 11 — Thank You / Contact (CTA + Converging Particles)

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add thank you HTML inside `#slide-11`**

```html
<div class="slide-inner" style="text-align:center; position:relative; z-index:2;">
  <div class="logo-watermark"><!-- Large faint BrewBeats logo SVG --></div>
  <h2 data-reveal class="thanks-title">Thank You</h2>
  <p class="creator-name" data-reveal style="transition-delay:0.3s">CREATOR_NAME</p>
  <div class="contact-links" data-reveal style="transition-delay:0.6s">
    <!-- CONTACT_LINKS placeholder: parameterized pills -->
    <a href="#" class="contact-pill">GitHub</a>
    <a href="#" class="contact-pill">LinkedIn</a>
    <a href="#" class="contact-pill">Email</a>
  </div>
  <p class="questions" data-reveal style="transition-delay:0.9s">Questions?</p>
  <div class="cta-wrap" data-reveal style="transition-delay:1.2s">
    <div class="glow-ring"></div>
    <div class="glow-ring" style="animation-delay:0.5s"></div>
    <div class="glow-ring" style="animation-delay:1s"></div>
    <a href="#" class="cta-button">Try BrewBeats →</a>
  </div>
  <p class="built-with" data-reveal style="transition-delay:1.5s">Built with ❤️ and AI</p>
</div>
```

- [ ] **Step 2: Add contact slide CSS**

- `.thanks-title`: large, warm-white
- `.creator-name`: caramel, `font-size: 1.5rem`
- `.contact-pill`: `border: 1px solid var(--roast-light)`, `border-radius: 20px`, `padding: 8px 20px`, hover → caramel border
- `.cta-button`: `background: var(--caramel)`, `color: var(--espresso)`, bold, `border-radius: 12px`, `padding: 16px 40px`, hover scale 1.05
- `.cta-wrap`: relative, inline-block, glow rings behind button
- `.logo-watermark`: centered, 300px, opacity 0.04
- `.built-with`: small, warm-dim

- [ ] **Step 3: Add converging particles effect for slide 11**

JS: When slide 11 enters viewport, add `converging` class to `.particles` container.
```css
.particles.converging .particle {
  animation: converge 8s ease-in-out infinite !important;
}
@keyframes converge {
  0% { transform: translate(0,0); }
  50% { transform: translate(calc(50vw - var(--px)), calc(50vh - var(--py))); opacity: 0.6; }
  100% { transform: translate(0,0); }
}
```
JS sets `--px` and `--py` custom properties on each particle (their initial left/top) so they converge toward center. When user scrolls away from slide 11, remove `converging` class.

- [ ] **Step 4: Verify thank you slide**

Scroll to slide 11. Expect: "Thank You" fades in, name in caramel, contact pills, pulsing CTA button with glow rings, particles drift toward center, faint logo behind.

### Task 18: Responsive Breakpoints + Final Polish

**Files:**
- Modify: `showcase.html`

- [ ] **Step 1: Add responsive CSS**

```css
@media (max-width: 1024px) {
  .split-layout { grid-template-columns: 1fr; gap: 24px; }
  .problem-cards, .summary-cards { grid-template-columns: repeat(2, 1fr); }
  .steps-flow { gap: 20px; }
  .hex { width: 100px; height: 100px; }
  .hero-title { font-size: clamp(2.5rem, 7vw, 5rem); }
}
@media (max-width: 768px) {
  .problem-cards, .summary-cards { grid-template-columns: 1fr; }
  .steps-flow { grid-template-columns: 1fr 1fr; }
  .hex-grid { gap: 10px; }
  .hex { width: 90px; height: 90px; }
  .slide-nav { right: 12px; gap: 8px; }
  .slide-nav .dot { width: 8px; height: 8px; }
  .hero-title { font-size: clamp(2rem, 10vw, 4rem); }
  .milestone.left, .milestone.right { flex-direction: column; align-items: flex-start; }
  .stats-row { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .steps-flow { grid-template-columns: 1fr; }
  .hex-grid { max-width: 250px; }
}
```

- [ ] **Step 2: Add `prefers-reduced-motion` wrapper**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  #hero-canvas, .particles, .blob, .viz-bars { display: none; }
  [data-reveal] { opacity: 1; transform: none; }
}
```

- [ ] **Step 3: Add 3D tilt JS for cards**

```js
document.querySelectorAll('.glass-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x*8}deg) rotateX(${-y*8}deg)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; card.style.transition = 'transform 0.5s ease'; });
});
```

- [ ] **Step 4: Final browser verification**

Open `showcase.html`. Test:
- All 11 slides load with scroll-snap
- Nav dots work (click + keyboard)
- Progress bar fills
- Every slide's animations trigger correctly
- Responsive at mobile width
- No console errors

---

## Execution Notes

- **All code goes into a single file:** `showcase.html`
- **Do NOT modify any existing app files**
- **Parameterized placeholders:** `CREATOR_NAME` and `CONTACT_LINKS` in Slide 11 — leave as editable placeholders for the user
- **SVG icons:** Create simple inline SVGs for all icons (keyboard, clock, lock, brain, sliders, download, music note logo). Keep them minimal (under 200 bytes each).
- **Circuit board SVG:** Inline as data URI in CSS background, very simple pattern
- **Target file size:** Under 120KB raw
