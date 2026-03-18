# BrewBeats

AI-powered browser music studio. Describe what you want to hear, get a multi-track composition in seconds.

## What It Does

- **Text to Music** — Type a prompt like "chill lo-fi beat with jazzy piano" and get a full composition
- **Beat Editor** — Visual grid editor with pencil, eraser, and select tools
- **AI Music Advisor** — Reviews your beat, suggests improvements as ghost notes you can accept or reject
- **8 Genre Presets** — Lo-fi, Jazz, Hip-hop, Electronic, Rock, R&B, Ambient, Classical
- **Real-Time Synthesis** — Pure Tone.js audio, no samples needed
- **MIDI + WAV Export** — Download your compositions for any DAW
- **Per-Track EQ** — 3-band equalizer (low/mid/high) on every instrument
- **Session Management** — Auto-saves your work

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No API key needed — uses Pollinations free AI by default.

Optionally set `NVIDIA_API_KEY` in `.env.local` for access to 130+ models.

## Tech Stack

- **Next.js 14** + TypeScript
- **Tone.js** — Browser audio synthesis
- **Zustand** — State management with undo/redo
- **Tailwind CSS** — Styling with custom Dusk Coffee palette
- **Framer Motion** — Animations
- **Pollinations AI** — Free LLM API (no key required)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| Escape | Stop |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| 1 / 2 / 3 | Pencil / Eraser / Select tool |

## License

MIT
