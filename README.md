# vectorvein-openclaw-skill

OpenClaw skill: run VectorVein Open API workflows from chat.

## What it does

Provides two commands:
- `run` — submit a workflow (fire-and-forget)
- `poll` — submit + poll check-status until done (recommended for async tasks like video transcription)

Workflows are **user-defined** after install. See `workflows.md` for setup guide.

## Configure (no secrets in repo)

### API Key (required)

Pick one:

| 方式 | 配置位置 | 生效范围 |
|------|---------|---------|
| OpenClaw skill env | `openclaw.json` → `skills.entries.vectorvein.env.VECTORVEIN_API_KEY` | subagent exec |
| Shell profile | `~/.zshrc` → `export VECTORVEIN_API_KEY=...` | CLI 直接调用 |
| Inline env | `VECTORVEIN_API_KEY=... node ...` | 单次测试 |

### Optional env vars

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VECTORVEIN_API_VERSION` | `20240508` | API 版本 |
| `VECTORVEIN_API_BASE_URL` | `https://vectorvein.com/api/v1/open-api` | API 地址 |
| `VECTORVEIN_HTTP_TIMEOUT_MS` | `60000` | 单次请求超时 |
| `VECTORVEIN_POLL_INTERVAL_MS` | `10000` | poll 轮询间隔 |
| `VECTORVEIN_POLL_MAX_MS` | `600000` | poll 最大总时长 |

## Files

- `SKILL.md` — Agent 使用指南
- `workflows.md` — Workflow 配置步骤
- `scripts/vectorvein_api_dispatch.mjs` — 主调度脚本
- `scripts/workflows.sample.json` — 配置模板

## License

MIT
