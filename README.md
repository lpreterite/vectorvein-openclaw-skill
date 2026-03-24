# vectorvein-openclaw-skill

OpenClaw skill: `/vectorvein` — run Vectorvein **Open API** workflows from chat.

## What it does

This skill provides a single, config-driven entrypoint:

```text
/vectorvein run <workflowKey> <jsonArgs>
```

Workflows are **user-defined** after install.

- This repo ships `skill/scripts/workflows.sample.json` only.
- You create `skill/scripts/workflows.json` locally (not committed).

See: `skill/workflows.md`.

## Configure (no secrets in repo)

Put your Vectorvein key in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "vectorvein": {
        "enabled": true,
        "env": {
          "VECTORVEIN_API_KEY": "YOUR_KEY",
          "VECTORVEIN_API_VERSION": "20240508",
          "VECTORVEIN_API_BASE_URL": "https://vectorvein.com/api/v1/open-api"
        }
      }
    }
  }
}
```

## Files

- `skill/SKILL.md`
- `skill/scripts/vectorvein_api_dispatch.mjs`
- `skill/scripts/workflows.sample.json`

## License

MIT (see LICENSE)
