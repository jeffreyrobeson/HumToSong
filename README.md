# LLL — Life Live Loop

> AI-powered music creation app: take a photo, tap an emotion, and let the music find you.
人工智能音乐创作应用：拍张照片，选择一种情绪，让音乐找到你。
---

## Overview

LLL turns everyday moments into music. Snap a photo, identify objects in the scene, express how you feel — and the AI matches you with a song. Your matched tracks collect into a personal card gallery you can browse entirely **hands-free** using real-time gesture control.

LLL 将日常瞬间转化为音乐。拍张照片，识别场景中的物体，表达你的感受——人工智能就会为你匹配一首歌曲。匹配到的曲目会收集到一个个人卡片库中，你可以使用实时手势控制完全解放双手地浏览它们。
---

## ✋ Gesture Control — Hands-Free Music Navigation

The standout feature of this app is a **touchless gesture interface** built on top of [MediaPipe Hand Landmarker](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker). No touch, no clicks — just your hand in front of the camera.

这款应用的突出特点是基于MediaPipe Hand Landmarker构建的非接触式手势界面。无需触摸，无需点击——只需将手放在摄像头前即可。

### How It Works

The gesture pipeline runs entirely in the browser at ~30 fps:
手势处理流程完全在浏览器中运行，帧率约为 30 fps：

```
Camera feed → MediaPipe WASM (GPU-accelerated) → Hand landmark detection
    → Gesture classifier → Zustand store → UI interaction
```

**Gesture detection** ([`gestureDetector.ts`](frontend/src/lib/gestureDetector.ts)) computes normalized distances between hand landmarks to classify three gestures:
手势检测（gestureDetector.ts）计算手部关键点之间的归一化距离，以对三种手势进行分类：

| Gesture | Detection Logic | Threshold |
|---------|----------------|-----------|
| `fist` | Avg fingertip–wrist distance | < 0.23 |
| `open_palm` | Avg fingertip–wrist distance | > 0.40 |
| `pinch` | Thumb tip ↔ index tip distance | < 0.06 |

The **`useHandGesture` hook** ([`useHandGesture.ts`](frontend/src/hooks/useHandGesture.ts)) manages the MediaPipe lifecycle — loading the WASM model, running per-frame detection in VIDEO mode, and exposing a clean enable/disable toggle with automatic resource cleanup.

钩子（）管理 MediaPipe 生命周期——加载 WASM 模型，在视频模式下运行逐帧检测，并提供一个干净的启用/禁用切换开关，并自动清理资源useHandGesture。useHandGesture.ts
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

## 🚀 Deployment / 部署运行

详细说明见 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)。要点：

- **后端**：FastAPI，生产端口 `9009`。`just dev-backend` 或 `uv run uvicorn app.main:app --host 0.0.0.0 --port 9009`。
- **前端**：开发用 `just dev-frontend`（Vite 5173）；生产需 `cd frontend && bun run build`，再把 `frontend/dist/` 同步进 `backend/static/`——后端会自动挂载并回退到 SPA（`backend/app/main.py` 中的 `StaticFiles`）。
- **AI 供应商**：识别/描述/匹配均走 **OpenAI 兼容**供应商（非 Gemini）。供应商与 key 通过网页**管理后台**管理，`provider_id` 对每个 AI 接口都是必填。
  - 首次启动 `db.init_db()` 建表；若 `.env` 填了 `ADMIN_PASSWORD` 且库内无密码，会自动哈希迁移入库。
  - 管理后台公开接口 `POST /api/admin/login`（校验密码、下发签名 cookie）；登录后可增删供应商与 key。
  - 普通用户经 `GET /api/providers`（脱敏）读取可选供应商下拉。
- **环境变量**（见 `.env.example`）：`ADMIN_PASSWORD`、`ADMIN_SESSION_SECRET`（生产务必改）、`MUSIC_BASE_URL`、`ALLOWED_ORIGINS`，以及可选的 `MODEL` / `QQ_MUSIC_API_KEY`。
- **⚠️ 切勿提交** `backend/data/config.db`（含管理密码哈希与 API key）与 `frontend/node_modules/`；`backend/static/` 是前端构建产物，已纳入仓库以便跳过构建直接运行。

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
