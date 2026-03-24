---
name: vectorvein
description: Run Vectorvein MCP tools via mcporter using stable English subcommands in chat. Use when user types /vectorvein with bili_video2podcast, nano_banana_image_generate, or summarize_meeting_audio.
metadata: {"openclaw":{"emoji":"🔌","skillKey":"vectorvein","requires":{"bins":["mcporter"],"env":["VECTORVEIN_MCP_KEY","VECTORVEIN_MCP_SERVER_ID"]}}}
---

# /vectorvein

A thin router that calls Vectorvein MCP tools through `mcporter` using stable English subcommands.

## Subcommands → MCP tool mapping

- `bili_video2podcast` → `video2podcast_mapper`
- `nano_banana_image_generate` → `anana`
- `summarize_meeting_audio` → `🗃️ 会议音频总结`

## Usage (recommended)

Send one of:

- `/vectorvein bili_video2podcast {"url_or_bvid":"BV..."}`
- `/vectorvein nano_banana_image_generate {"prompt":"...","aspect_ratio":"16:9"}`
- `/vectorvein summarize_meeting_audio {"text":"...","files":["/path/a.m4a"],"show_download":true}`

## Execution (deterministic)

- Run `{baseDir}/scripts/vectorvein_dispatch.py <subcommand> <jsonArgs>`.
- The dispatcher reads `VECTORVEIN_MCP_KEY` + `VECTORVEIN_MCP_SERVER_ID` from env and builds the MCP SSE baseUrl at runtime.
- Calls are made via `mcporter call --http-url ... --tool ... --args ... --output json`.
