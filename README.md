# LLL — Life Live Loop

> AI-powered music creation app: take a photo, tap an emotion, and let the music find you.

---

## Overview

LLL turns everyday moments into music. Snap a photo, identify objects in the scene, express how you feel — and the AI matches you with a song. Your matched tracks collect into a personal card gallery you can browse entirely **hands-free** using real-time gesture control.

---

## ✋ Gesture Control — Hands-Free Music Navigation

The standout feature of this app is a **touchless gesture interface** built on top of [MediaPipe Hand Landmarker](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker). No touch, no clicks — just your hand in front of the camera.

### How It Works

The gesture pipeline runs entirely in the browser at ~30 fps:

```
Camera feed → MediaPipe WASM (GPU-accelerated) → Hand landmark detection
    → Gesture classifier → Zustand store → UI interaction
```

**Gesture detection** ([`gestureDetector.ts`](frontend/src/lib/gestureDetector.ts)) computes normalized distances between hand landmarks to classify three gestures:

| Gesture | Detection Logic | Threshold |
|---------|----------------|-----------|
| `fist` | Avg fingertip–wrist distance | < 0.23 |
| `open_palm` | Avg fingertip–wrist distance | > 0.40 |
| `pinch` | Thumb tip ↔ index tip distance | < 0.06 |

The **`useHandGesture` hook** ([`useHandGesture.ts`](frontend/src/hooks/useHandGesture.ts)) manages the MediaPipe lifecycle — loading the WASM model, running per-frame detection in VIDEO mode, and exposing a clean enable/disable toggle with automatic resource cleanup.

### Gesture → Action Mapping (Collection Page)

In the card gallery, hand position and gesture type map to specific UI actions:

| Gesture | Hand Zone | Action |
|---------|-----------|--------|
| `fist` | Left third of screen | Scroll cards left |
| `fist` | Right third of screen | Scroll cards right |
| `pinch` | Center | Hold for 1 s → play track |
| `open_palm` | Anywhere | Stop playback |

Scroll intensity scales with how deep into the edge zone your hand is — the further left/right, the faster the scroll.

### Charge-to-Play Mechanic

Pinching in the center triggers a **charge gesture**: hold the pinch for 1 second to confirm playback. Visual feedback includes:

- SVG arc progress ring that fills as you hold ([`ChargeEffect.tsx`](frontend/src/components/ChargeEffect.tsx))
- Particle burst at hand position ([`GestureParticles.tsx`](frontend/src/components/GestureParticles.tsx))
- 3D card scale-up (up to 15% zoom) with cyan glow ([`Card3DCarousel.tsx`](frontend/src/components/Card3DCarousel.tsx))
- Pulse ring animation on completion

A 500 ms cooldown prevents accidental double-triggers.

### Visual Feedback System

| Component | Description |
|-----------|-------------|
| [`HandCursor.tsx`](frontend/src/components/HandCursor.tsx) | Real-time hand cursor with rainbow trail (last 20 positions, 0.5 s fade) |
| [`GestureParticles.tsx`](frontend/src/components/GestureParticles.tsx) | Particles rising from hand position on pinch |
| [`ChargeEffect.tsx`](frontend/src/components/ChargeEffect.tsx) | SVG progress arc + pulse ring on charge completion |
| [`CameraPreview.tsx`](frontend/src/components/CameraPreview.tsx) | Mirrored 160×120 px camera thumbnail in the corner |

Cursor appearance changes with gesture state: cyan ring (default) → purple ring (pinch) → purple dot (fist).

### 3D Card Carousel Physics

[`Card3DCarousel.tsx`](frontend/src/components/Card3DCarousel.tsx) uses a lightweight physics simulation:

- **Friction:** velocity decays at 0.92× per frame
- **Max velocity:** capped at 0.25 units/frame
- **Gesture input:** smoothly interpolated at 0.2 blend factor
- **Charge feedback:** card scales and glows in proportion to `chargeProgress`

---

## App Flow

```
📷 CameraPage     — Capture a photo
🥁 PlayPage       — Tap drum pads to express emotion
🎵 ResultPage     — AI-generated music match
🃏 CollectionPage — Browse your collection with gesture control
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Zustand |
| Gesture | MediaPipe Hand Landmarker (WASM, GPU delegate) |
| Backend | Python 3.12+, FastAPI, Google Gemini API |
| Tooling | Bun, Biome, Ruff, justfile, Docker |

---

## Development

```bash
just dev-frontend   # Start frontend dev server
just dev-backend    # Start backend dev server
just up             # Run both with Docker
just ci             # Lint + typecheck + test
just fix            # Auto-fix formatting and lint
```

Requires a `.env` file with:

```
GEMINI_API_KEY=your_key_here
```

---

## Project Structure

```
frontend/src/
├── lib/
│   └── gestureDetector.ts      # Core gesture classification
├── hooks/
│   └── useHandGesture.ts       # MediaPipe lifecycle hook
├── stores/
│   └── gestureStore.ts         # Gesture state (Zustand)
├── components/
│   ├── HandCursor.tsx           # Hand cursor + trail
│   ├── GestureParticles.tsx     # Particle effects
│   ├── ChargeEffect.tsx         # Charge progress arc
│   ├── CameraPreview.tsx        # Camera thumbnail
│   └── Card3DCarousel.tsx       # Physics-based 3D carousel
└── pages/
    └── CollectionPage.tsx       # Main gesture interaction page

backend/
├── api/                         # FastAPI routes
├── services/                    # Gemini + music matching
└── data/music_library.json      # 10-song curated library
```
