# BrewBeats Showcase Website — Design Spec

**Date:** 2026-03-15
**Status:** Reviewed & Final
**Goal:** A single self-contained HTML file that showcases BrewBeats (AI Music Studio) to college decision-makers and potential funders. Must be presentation-grade, visually stunning, and keep focus on the product.

---

## 1. Format & Delivery

- **Single HTML file** — all CSS, JS, SVGs inlined. Zero external dependencies.
- **Output location:** `C:\Users\dnaco\OneDrive\Documents\project\Music Prompter\showcase.html`
- **Portability:** Opens in any modern browser. Can be emailed, USB'd, or hosted anywhere.

## 2. Design Direction

**Hybrid Power Deck** — scroll-snap slide presentation with cinematic animations and music-reactive elements.

- **Primary vibe:** Cinematic premium (Apple product page / Linear landing page)
- **Secondary:** BrewBeats dusk coffee palette woven throughout
- **Tertiary:** Clean modern sections for breathing room

**Audience:** College peers, teachers, and higher-level employers/funders. Must signal product thinking, technical depth, and ambition.

## 3. Navigation & Interaction

- **Scroll-snap:** Each section occupies full viewport height, snaps into place
- **Side navigation dots:** Clickable dots on the right edge, highlight current section
- **Keyboard navigation:** Arrow Up/Down, Page Up/Down to move between slides
- **Progress indicator:** Waveform-shaped progress bar at top that fills as user scrolls
- **Section counter:** "3 / 11" displayed near nav dots
- **Smooth scroll:** JS-driven `scrollTo({ behavior: 'smooth' })` for nav dots and keyboard (avoids CSS `scroll-behavior` conflicts with `scroll-snap-type`)

## 4. Color System

| Token | Hex | Usage |
|-------|-----|-------|
| Black base | `#0a0908` | Deepest background |
| Espresso | `#1a1210` | Section backgrounds, layering |
| Roast | `#2a1f1a` | Card backgrounds, surfaces |
| Roast-light | `#3a2d25` | Borders, subtle dividers |
| Caramel | `#c8956c` | Primary accent, CTAs, highlights |
| Cream | `#e8c5a0` | Body text, secondary highlights |
| Gold | `#e8c06c` | Sparkle effects, counters, secondary accent |
| Dusk | `#7a4a6b` | Purple accent, gradient blobs |
| Dusk-light | `#9b6b8a` | Lighter purple, hover states |
| Warm-white | `#f0e6dc` | Headings, bright text |
| Warm-dim | `#b0a090` | Muted text, labels |

## 5. Typography

- **Headings:** `system-ui, -apple-system, 'Segoe UI', sans-serif` — bold, tight letter-spacing (`-0.02em` to `-0.04em`), large sizing (clamp-based responsive)
- **Body:** Same stack, weight 400, line-height 1.6-1.7
- **Accent text:** Caramel-colored with optional text-shadow glow
- **Monospace (tech):** `'SF Mono', 'Cascadia Code', 'Consolas', monospace`

## 6. Global Animation Systems

All animation driven by Intersection Observer (trigger on scroll-enter) + CSS keyframes + minimal JS canvas.

### 6.1 Canvas Waveform (Hero)
- Procedural sine wave animation on `<canvas>` element
- 4 layered sine waves with different frequencies, amplitudes, and phase offsets
- Colors: caramel, gold, dusk at varying opacities (0.3-0.6)
- Smooth morphing over time using `requestAnimationFrame`

### 6.2 Particle System
- 80-100 particles as small DOM elements (JS-generated at runtime with randomized inline styles for position, size, opacity, animation-duration)
- CSS `@keyframes` handle the drift animation (3 shared keyframe sets for 3 depth layers)
- 3 depth layers with parallax on scroll (different translateY speeds)
- Drift animation durations randomized 15s-40s per particle
- Colors: caramel, gold, dusk, warm-white at low opacity (0.1-0.4)

### 6.3 Morphing Gradient Blobs
- 2-3 large radial gradient circles (`width: 40vw+`)
- CSS `@keyframes` to shift position, scale, and color
- Filter: `blur(80px+)` for soft glow effect
- Colors shift: caramel ↔ dusk ↔ gold per section context

### 6.4 Magnetic Cursor Glow
- JS `mousemove` listener sets CSS custom properties `--mx`, `--my`
- Radial gradient follows cursor: `radial-gradient(circle at var(--mx) var(--my), rgba(200,149,108,0.08), transparent 50%)`
- Applied to a fullscreen fixed overlay, `pointer-events: none`

### 6.5 Scroll Progress Waveform
- Fixed top bar, `height: 4px`
- SVG path shaped like an audio waveform
- `stroke-dashoffset` animated based on scroll percentage
- Color: caramel with gold glow

### 6.6 Staggered Reveals
- Elements within each slide have `data-reveal` attribute
- Intersection Observer adds `.revealed` class on enter
- CSS transitions: `opacity 0→1`, `translateY 30px→0`
- Stagger via `transition-delay` increments (0ms, 100ms, 200ms, 300ms...)
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo feel)

### 6.7 SVG Path Drawing
- SVG elements with `stroke-dasharray` = total path length
- On reveal: `stroke-dashoffset` transitions from full length to 0
- Used for: connecting lines, icon outlines, decorative elements

### 6.8 Counter Animations
- Numbers count from 0 to target value over 1.5s
- Triggered by Intersection Observer on enter
- Easing applied to count speed (fast start, slow end)

### 6.9 3D Perspective Tilts
- Feature cards: `transform: perspective(800px) rotateX(var(--rx)) rotateY(var(--ry))`
- JS `mousemove` on card calculates tilt angle from cursor position
- Max tilt: ±8 degrees. Smooth transition on mouse leave → reset

### 6.10 Glitch Text Effect
- Hero title only, on load
- Brief 0.5s glitch: CSS `clip-path` slices + `transform: translate` offsets + color channel split (red/cyan shadows)
- Settles into clean text after glitch completes

### 6.12 Typewriter Effect
- Typing speed: 60ms per character
- Cursor: solid block `|`, caramel colored, blinks at 530ms interval via CSS `@keyframes`
- Cursor disappears 500ms after typing completes
- Used on: Slide 1 subtitle, Slide 3 question text

### 6.13 Frosted Glass Cards
- `background: rgba(42, 31, 26, 0.6)` (roast at 60% opacity)
- `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px)`
- `border: 1px solid rgba(200, 149, 108, 0.15)` (caramel at 15%)
- `border-radius: 16px`
- Subtle `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3)`
- Used on: Slides 2, 6, 10

### 6.11 Pulsing Glow Rings
- Concentric circles expanding outward from key elements (CTA, logo)
- CSS `@keyframes`: scale 1→2.5, opacity 0.6→0
- 2-3 rings staggered for continuous pulse effect
- Color: caramel with 0.3 opacity

## 7. Slide-by-Slide Specification

### Slide 1 — HERO / TITLE
**Layout:** Centered, full viewport
**Background:** Canvas waveform + particle system (3 layers) + morphing gradient blob (caramel→dusk)
**Content:**
- "BrewBeats" — massive heading (clamp(3rem, 8vw, 7rem)), bold, warm-white
  - Glitch effect on load → settles after 0.5s
- "AI-Powered Music Studio" — subtitle, typewriter effect, caramel
- "Describe it. Hear it. Own it." — tagline, fades in after typewriter completes, cream
- Down arrow CTA with pulsing glow ring, bouncing animation
**Animations:** Canvas waveform loops continuously, particles drift, blob morphs, staggered text reveals

### Slide 2 — THE PROBLEM
**Layout:** 3 cards in horizontal row (stack on mobile)
**Background:** Espresso base + slow-moving diagonal lines (CSS repeating-linear-gradient, animated `background-position`)
**Content — 3 frosted glass cards:**
1. Icon (keyboard SVG, path draws itself) + "Expensive" + "Professional DAW software costs hundreds. Plugins cost more."
2. Icon (clock SVG, draws) + "Complex" + "Months to learn. Years to master. Most people give up."
3. Icon (lock SVG, draws) + "Inaccessible" + "Music creation locked behind technical barriers."
**Animations:** Cards fly in — left card from left, center from bottom, right from right. SVG icons draw on arrival. 300ms stagger between cards.

### Slide 3 — THE SOLUTION
**Layout:** Center-aligned, dramatic
**Background:** Deep black with golden radial burst (CSS radial-gradient, expands on reveal)
**Content:**
- "What if you could just..." — fades in
- "describe it?" — typewriter, caramel colored, slight pause before typing
- Golden radial light expands from center (CSS animation, scale 0→1)
- BrewBeats logo (SVG music note in gradient badge) scales up from 0 with slight rotation
- One-liner: "BrewBeats turns your words into music." — fades in, caramel underline draws itself left-to-right

### Slide 4 — FEATURE: Prompt-to-Music
**Layout:** Split — left 55% (chat mockup), right 45% (description)
**Background:** Espresso + subtle waveform pattern (CSS, low opacity)
**Left — Animated Chat Mockup:**
- Dark rounded container (`background: #1a1210`, `border-radius: 12px`, `padding: 20px`, `border: 1px solid #3a2d25`)
- User message bubble types in: "Create a chill lo-fi beat with piano and soft drums"
- 500ms pause
- Assistant response slides up with composition card: title "Midnight Study Session", track list cascades in (piano, drums, bass)
- Genre preset pills (Lo-Fi, Jazz, Hip-Hop) float in around chat with subtle bounce
**Right — Description:**
- "Prompt-to-Music" heading, staggered reveal
- 3 bullet points reveal with stagger: natural language, iterative editing, 8 genre presets
**Animations:** Chat typing, bubble slides, card cascade, pill float-in, text reveals

### Slide 5 — FEATURE: Timeline Editor
**Layout:** Full-width mockup above, description below
**Background:** Espresso gradient
**Mockup — Animated Piano Roll:**
- Dark grid container, 16 columns (one 4/4 bar of 16th notes) x 4 rows (Piano, Drums, Bass, Synth)
- Track labels slide in from left with stagger
- ~12 notes drop in one-by-one with bounce easing, color-coded (caramel=piano, gold=drums, dusk=bass, cream=synth)
- Playhead (vertical caramel line) sweeps across the grid on loop (CSS animation, 4s duration)
- Zoom animation: grid subtly scales in 1.0→1.05→1.0 to show detail
**Below — Description:**
- "Visual Timeline Editor" heading
- Key points: click-to-edit, zoom, color-coded tracks, 16th-note precision

### Slide 6 — FEATURE: Mixer & Visualizer
**Layout:** Center mockup with description overlay
**Background:** Deep black + CSS visualizer bars (20 bars, bottom-aligned, random height animations)
**Mockup — Animated Mixer:**
- Horizontal strip with 4 channel cards (Piano, Drums, Bass, Synth)
- Each card: volume fader slides up to random level (staggered), M/S buttons flash
- Waveform SVG line draws across bottom of mixer
**Behind Mockup — Visualizer:**
- 20 vertical bars, each with independent CSS animation (random `animation-duration` 0.4s-1.2s)
- Colors: gradient from dusk (low frequencies) to caramel (mid) to gold (high)
- Low opacity (0.15) so mockup stays in focus
**Description — Frosted glass overlay card:**
- "Professional Mixer" heading
- Per-track volume, reverb, delay, mute/solo, real-time visualizer

### Slide 7 — HOW IT WORKS
**Layout:** 4 steps in horizontal row connected by SVG line
**Background:** Espresso + circuit-style dotted pattern (very faint)
**Steps (left to right):**
1. Circle icon (keyboard) + "Type" + "Describe your music in plain language"
2. Circle icon (brain/sparkle) + "Generate" + "AI composes a multi-track piece"
3. Circle icon (sliders) + "Edit" + "Fine-tune with timeline, mixer & chat"
4. Circle icon (download) + "Export" + "Download as WAV, share anywhere"
**Connecting SVG Path:** Horizontal line between circles, draws itself left-to-right as steps reveal
**Animations:** Steps reveal left-to-right with 400ms stagger. Each circle has rotating ring animation on reveal (thin caramel border rotates 360°). SVG line draws between steps. Icons draw their paths.

### Slide 8 — TECH STACK
**Layout:** Hexagonal grid center + stats below
**Background:** Deep black + faint circuit-board SVG (animated `stroke-dashoffset` crawl)
**Hex Grid — 6 hexagons (CSS `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)`):**
- Next.js, Tone.js, Zustand, Tailwind CSS, Framer Motion, AI/LLM
- Each hex: colored border (cycling caramel/gold/dusk), icon/text inside
- Fade in with scale-up (0.8→1) + subtle continuous float (translateY ±5px)
**Stats Row — 4 counters:**
- "50+" Instruments (counter animation 0→50)
- "8" Genre Presets (counter 0→8)
- "Real-time" Synthesis (text fade-in)
- "WAV" Export (text fade-in)
- Each counter has golden glow pulse on completion

### Slide 9 — VISION / ROADMAP
**Layout:** Vertical timeline, center-aligned
**Background:** Deep black + starfield (JS-generated at runtime: 80 tiny dots via `box-shadow` on a single element, subtle twinkle via CSS opacity animation)
**Timeline:**
- Vertical line draws itself top-to-bottom (SVG, caramel stroke)
- 4 milestone nodes along the line:
  1. "Now" — "Browser-based AI music studio" (golden glow, active)
  2. "Next" — "Mobile app & touch interface"
  3. "Future" — "Real-time collaboration"
  4. "Vision" — "Plugin marketplace & MIDI export"
- Each node: circle marker + card to alternating sides (left/right)
- Nodes pulse with golden glow as they appear (staggered on scroll-enter)

### Slide 10 — CONCLUSION
**Layout:** 3 summary cards in row + impact statement below
**Background:** Espresso gradient with warm radial glow center
**Cards (frosted glass, fly in from bottom with stagger):**
1. "The Problem" — "Music creation is locked behind complexity and cost"
2. "What We Built" — "A conversational AI studio that runs in your browser"
3. "What's Next" — "A platform that democratizes music creation for everyone"
**Impact Statement:**
- Large italic text, center-aligned, fades in last
- "We're not just building a tool. We're opening a door."
- Golden horizontal rules draw themselves above and below the statement

### Slide 11 — THANK YOU / CONTACT
**Layout:** Clean centered layout
**Background:** Deep black + particles converging toward center (reverse drift of hero)
**Content:**
- BrewBeats logo watermark (large, very low opacity, background)
- "Thank You" — large heading, warm-white
- Creator name (parameterized: replace `CREATOR_NAME` placeholder) — medium heading, caramel
- Contact links as subtle pill buttons (parameterized: replace `CONTACT_LINKS` placeholder with GitHub, LinkedIn, email, etc.)
- "Questions?" — warm-dim, inviting
- CTA button: "Try BrewBeats →" with pulsing glow rings (2-3 concentric)
- Subtle: "Built with ❤️ and AI"

## 8. Responsive Behavior

- **Desktop (>1024px):** Full layout as designed
- **Tablet (768-1024px):** Cards stack 2-column where needed, font sizes scale down
- **Mobile (<768px):** Single column, cards stack vertically, nav dots smaller, canvas waveform simplified (fewer waves), hex grid becomes 2x3

## 9. Performance & Accessibility

- Canvas animations use `requestAnimationFrame` with visibility check (pause when off-screen)
- Intersection Observer `threshold: 0.2` for triggering reveals
- CSS animations preferred over JS where possible
- Particles: JS generates DOM nodes at runtime; CSS keyframes handle animation (keeps file size low)
- Total file size target: under 120KB raw (HTML + inlined CSS + JS). If over budget, cut starfield count and reduce particle count first.
- **`prefers-reduced-motion`:** Wrap all animations/transitions in `@media (prefers-reduced-motion: no-preference)`. When reduced motion is preferred: disable canvas waveform, particles, glitch, parallax; keep simple opacity fades for reveals.
- **ARIA:** Nav dots have `role="tablist"` with `aria-label="Slide navigation"`. Each dot is `role="tab"` with `aria-selected`. Slides have `role="tabpanel"`.
- **Graceful degradation:** If canvas unsupported, hero falls back to static CSS gradient. If JS disabled, all content is visible (just no animations).

## 10. File Output

- **Single file:** `showcase.html` in project root (`C:\Users\dnaco\OneDrive\Documents\project\Music Prompter\showcase.html`)
- **No external dependencies:** Everything inlined
- **No modification to existing app files**
