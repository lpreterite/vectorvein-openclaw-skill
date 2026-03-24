---
name: vectorvein
description: Run Vectorvein Open API workflows from chat via /vectorvein, using a single config-driven Node.js dispatcher (no per-workflow functions). Use for workflows like bili_video_transcript (B站音频转文字) and summarize_meeting_audio.
metadata: {"openclaw":{"emoji":"🔌","skillKey":"vectorvein","requires":{"bins":["node"],"env":["VECTORVEIN_API_KEY"]}}}
---

# /vectorvein (Vectorvein Open API)

This skill calls Vectorvein **Open API** (not MCP) using a config-driven dispatcher.

## One command shape (config-driven)

Use:

- `/vectorvein run <workflowKey> <jsonArgs>`

Where `workflowKey` is defined in `{baseDir}/scripts/workflows.json`.

## Built-in workflow keys

- `bili_video_transcript` — 📽️ B站视频原文提取（音频转文字）
  - args: `{ "url_or_bvid": "https://b23.tv/..." }`

- `summarize_meeting_audio` — 🗃️ 会议音频总结
  - args: `{ "text": "...", "files": [] }`

- `nano_banana_image_generate` — 🍌 NanoBanana 生图
  - args: `{ "prompt": "...", "aspect_ratio": "1:1" }`

## Execution (deterministic)

When the user sends a message starting with `/vectorvein`:

1) Parse as: `run <workflowKey> <jsonArgs>`.
2) Execute the bundled Node dispatcher:

- `{baseDir}/scripts/vectorvein_api_dispatch.mjs run <workflowKey> '<jsonArgs>'`

3) Credentials:
- Reads `VECTORVEIN_API_KEY` from env (configure via OpenClaw skills entry env injection; keep keys out of the repo).
- API version/baseUrl default to the bundled workflow config but can be overridden with env:
  - `VECTORVEIN_API_VERSION`
  - `VECTORVEIN_API_BASE_URL`

4) Return the dispatcher stdout JSON to the user.

## Notes

- This skill intentionally keeps workflow definitions in `workflows.json` so adding a new workflow is config-only.
- Result polling / fetching output fields depends on Vectorvein Open API result endpoints (add once documented).
