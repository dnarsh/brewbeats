# BrewBeats - Design Document

## Overview
BrewBeats is a music creation app powered by NVIDIA NIM. Users type text prompts to generate music compositions with multiple instruments. An LLM interprets prompts and returns structured JSON compositions, which Tone.js synthesizes into real audio in the browser.

## Architecture

```
User Prompt -> Next.js API Route -> NVIDIA NIM LLM -> Structured JSON composition
                                                           |
User <- Audio Playback <- Tone.js synthesizes <- Composition data
```

### Flow
1. User types a prompt ("Create a chill lo-fi beat with piano and soft drums")
2. Next.js API route sends it to NVIDIA NIM LLM with a system prompt that instructs it to return structured JSON (notes, instruments, timing, tempo, sections)
3. LLM returns a JSON composition object
4. Frontend parses it and feeds it to Tone.js to synthesize real audio
5. User sees the visual timeline + mixer, can edit via prompt or manually
6. Conversation history is maintained so "make it jazzier" works contextually

## Tech Stack
- **Next.js 14** (App Router)
- **Tone.js** for audio synthesis
- **Tailwind CSS** for styling
- **NVIDIA NIM** LLM via `https://integrate.api.nvidia.com/v1/chat/completions`
- **Zustand** for state management

## Core Instruments (launch)
Piano, Acoustic Guitar, Electric Bass, Drum Kit (kick/snare/hihat/toms), Synth Pad

Architecture uses an instrument registry - adding more is just a config entry.

## LLM Composition Format (JSON)

```json
{
  "title": "Chill Evening",
  "bpm": 85,
  "key": "Cm",
  "timeSignature": "4/4",
  "tracks": [
    {
      "instrument": "piano",
      "volume": 0.7,
      "notes": [
        { "note": "C4", "duration": "8n", "time": "0:0:0" },
        { "note": "Eb4", "duration": "8n", "time": "0:0:2" }
      ]
    },
    {
      "instrument": "drums",
      "volume": 0.6,
      "pattern": [
        { "drum": "kick", "time": "0:0:0" },
        { "drum": "hihat", "time": "0:0:2" }
      ]
    }
  ]
}
```

## UI Layout

```
+---------------------------------------------------+
|  BrewBeats                            [Settings]   |
+----------------------+----------------------------+
|                      |                            |
|   Chat / Prompt      |    Visual Timeline Grid    |
|   Panel              |    +--------------------+  |
|                      |    | Piano    ## ###     |  |
|   [user msgs]        |    | Guitar   ###  #    |  |
|   [ai responses]     |    | Bass     # # # #   |  |
|   [composition       |    | Drums    ########  |  |
|    status]           |    | Synth      ##  #   |  |
|                      |    +--------------------+  |
|                      |                            |
|   [prompt input]     |    Transport Controls      |
|                      |    [prev play next] BPM:90 |
+----------------------+----------------------------+
|         Mixer Panel                               |
|  Piano [=====---] Guitar [====----] Bass [===----]|
|  Drums [=====---] Synth  [==------]               |
|  [M][S]           [M][S]           [M][S]         |
+---------------------------------------------------+
```

## Color Palette (Dusk Coffee)
- Background: `#1a1210` (espresso black)
- Surface: `#2a1f1a` (dark roast)
- Accent: `#c8956c` (caramel/amber)
- Highlight: `#e8c5a0` (cream/foam)
- Dusk accent: `#7a4a6b` (dusk purple)
- Text: `#f0e6dc` (warm white)

## Features

### Prompt-based Creation
- Contextual conversation history maintained
- User can say "add more bass", "make it faster", "change to minor key"
- LLM re-generates composition with full context

### Visual Timeline Editor
- Grid view showing each instrument track
- Click to add/remove notes
- Drag to rearrange sections
- Zoom in/out on timeline

### Mixer Panel
- Volume sliders per instrument
- Mute/Solo buttons per track
- Master volume control
- Tempo control slider

### Transport Controls
- Play/Pause/Stop
- Loop toggle
- BPM display and adjustment

### Export
- Download composition as WAV audio file

### Instrument Registry
- Plugin architecture for easy instrument expansion
- Each instrument defined by: name, type, synth config, icon
- Adding a new instrument = one config entry

## API Integration

### NVIDIA NIM LLM
- Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`
- Authentication: Bearer token via API key
- Model: configurable (default: meta/llama-3.1-70b-instruct or similar)
- System prompt instructs LLM to return valid JSON composition format
- Conversation history sent with each request for contextual editing

### API Route Security
- NVIDIA API key stored in `.env.local` server-side only
- Next.js API route proxies requests - key never exposed to client
