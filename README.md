# vectorvein (OpenClaw skill)

An OpenClaw skill that routes `/vectorvein ...` chat commands to a Vectorvein MCP server via `mcporter`, using stable English subcommands.

## Why

Some MCP tools expose non-English or emoji tool names. This skill provides stable English aliases for use in chat.

## Commands

### 1) Bili video → podcast

```text
/vectorvein bili_video2podcast {"url_or_bvid":"BV..."}
```

### 2) Nano Banana image generate

```text
/vectorvein nano_banana_image_generate {"prompt":"a cute cat","aspect_ratio":"16:9"}
```

### 3) Summarize meeting audio

```text
/vectorvein summarize_meeting_audio {"text":"...","files":["/path/to/audio.m4a"],"show_download":true}
```

## Configuration (no secrets in repo)

This repo contains **no keys**. Configure credentials in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "vectorvein": {
        "enabled": true,
        "env": {
          "VECTORVEIN_MCP_KEY": "YOUR_KEY",
          "VECTORVEIN_MCP_SERVER_ID": "YOUR_SERVER_ID"
        }
      }
    }
  }
}
```

## Requirements

- `mcporter` must be available in PATH.

## Security

- The dispatcher reads only `VECTORVEIN_MCP_KEY` and `VECTORVEIN_MCP_SERVER_ID` from env.
- The skill does not scrape other env vars and does not write to disk.

## License

MIT. See [LICENSE](./LICENSE).
