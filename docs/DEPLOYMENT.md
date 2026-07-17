# DEPLOYMENT.md

HumToSong（产品名仍沿用 `LLL — Life Live Loop`）的部署与运行说明，基于当前代码实际行为整理。

技术栈：前端 Bun + React + Vite + TypeScript + Tailwind + Framer Motion + Zustand；后端 Python 3.12+ + FastAPI，SQLite（`backend/data/config.db`），uv 管理依赖；`just` 作为命令编排。

---

## 1. 本地开发

依赖：[Bun](https://bun.sh/)、[uv](https://docs.astral.sh/uv/)、`just`。

```bash
# 后端
just dev-backend
# 等价：cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 9009

# 前端（另开一个终端，Vite 5173）
just install-frontend    # cd frontend && bun install
just dev-frontend        # cd frontend && bun run dev
```

开发期前后端分跑：前端 5173，通过 `/api` 代理或直连后端 9009。CORS 由 `ALLOWED_ORIGINS` 控制，默认 `http://localhost:5173`。

---

## 2. 环境变量

仓库根目录 `.env`（模板见 `.env.example`）：

| 变量 | 说明 | 默认 |
|---|---|---|
| `ADMIN_PASSWORD` | 管理后台登录密码；留空则管理后台禁用 | 空 |
| `ADMIN_SESSION_SECRET` | 管理后台 session cookie 签名密钥，**生产务必改成强随机串** | `change-me-in-prod` |
| `MUSIC_BASE_URL` | 内置音乐资源基址 | `http://localhost:5173/music` |
| `ALLOWED_ORIGINS` | CORS 白名单（逗号分隔），见 `backend/app/config.py` | `http://localhost:5173` |
| `MODEL` | 可选，遗留 Gemini 模型名 | `gemini-2.5-flash` |
| `QQ_MUSIC_API_KEY` | 可选，QQ 音乐点歌 API（cyapi.top）密钥 | 空 |
| `GEMINI_API_KEY` | 可选，遗留字段（当前主路径走 OpenAI 兼容供应商） | 空 |

> ⚠️ `.env` 与 `backend/data/config.db` 绝不提交仓库（见第 6 节）。

---

## 3. 后端端口与入口

- 端口固定 **9009**（`justfile` `dev-backend`）。
- 入口：`backend/app/main.py` → `app.main:app`。启动时执行 `db.init_db()` 建供应商/key/管理表，`admin_service.seed_admin_password_from_env()` 把 `.env` 里的明文管理密码**一次性哈希迁移进 DB**（之后以 DB 为准，网页改密码只改 DB）。
- 路由前缀 `/api`：`/api/admin/*`、`/api/providers`、`/api/identify-objects`、`/api/generate-description`、`/api/match-music`、`/api/merge-layers`、`/api/playable-url` 等。
- 健康检查 `GET /health` → `{"status":"ok"}`。

---

## 4. 生产前端构建 → 后端静态托管

后端在 `backend/static/` 存在时会自动挂载 SPA（`main.py` 末尾 `StaticFiles`），无需额外静态服务器。

```bash
# 1) 构建前端
cd frontend && bun run build          # 产物在 frontend/dist

# 2) 同步进后端 static（覆盖）
cp -r dist/. ../backend/static/

# 3) 起后端（生产关掉 --reload）
cd ../backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 9009
# 访问 http://<host>:9009/  即为前端 + API 同源
```

`backend/static/` 已纳入仓库（`assets/`、`index.html`、`music/`、`vite.svg`），因此也可以跳过构建直接跑后端。

---

## 5. AI 路径：OpenAI 兼容供应商（provider_id 必填）

识别 / 描述 / 匹配 / 协作合并均走 **OpenAI 兼容**供应商（`backend/app/services/openai_client.py`），通过供应商的 `base_url + chat/completions`，多模态识图用 `image_url`（base64 data URL）。

- 每个 AI 接口请求体里的 `provider_id` 都是**必填**（`backend/app/models/objects.py` 等，缺省/为 null 直接 422）。前端 `lib/api.ts` 中 `resolveProviderId()` 会在未选定供应商时自动取 `/api/providers` 的第一个兜底，避免 422。
- 供应商及其 key 存在 SQLite（`backend/data/config.db`），前端通过管理后台维护。

### 管理后台

1. 先在 `.env` 设 `ADMIN_PASSWORD`（首次启动会哈希进 DB），首启后即可在网页改密码。
2. `POST /api/admin/login` 校验密码并下发签名 cookie（PBKDF2-HMAC-SHA256 比对，8 小时 TTL，见 `backend/app/services/admin.py`）。
3. 登录后调管理接口增删供应商与 key：
   - `POST /api/admin/providers` 增供应商（`name`/`base_url`/`model`）
   - `POST /api/admin/providers/{pid}/keys` 增 key
   - `DELETE /api/admin/providers/{pid}` / `DELETE /api/admin/keys/{kid}`
   - `POST /api/admin/change-password` 改管理密码
4. 普通用户 `GET /api/providers` 只拿到脱敏列表（无 key）。
5. 上游 429/5xx 会自动短暂重试一次并轮换 key（FIFO，`openai_client.generate_content`）。

> 前端设置页形状见 `frontend/src/pages/SettingsPage.tsx`；i18n 见 `frontend/src/lib/i18n.tsx`。

---

## 6. 切勿提交的产物 / 敏感文件

`.gitignore` 已覆盖绝大多数；手动 `git add` 时尤其注意**不要**加入：

- `backend/data/config.db` —— SQLite，含管理密码哈希、供应商 API key。
- `.env` / `.env.local` —— 明文密钥。
- `frontend/node_modules/` / `backend/.venv/` —— 依赖。
- `frontend/dist/` —— Vite 构建中间产物（已同步进 `backend/static/`，无需单独提交）。

`backend/static/` 是前端构建产物，**已纳入仓库**，允许跳过前端构建直接运行后端。

---

## 7. CI / 提交前检查

```bash
just ci     # lint + typecheck + test
just fix    # 格式化 + 自动修 lint
```

前端用 Biome，后端用 Ruff（lint/format）+ `ty`（类型检查）。详见 `AGENTS.md`。
