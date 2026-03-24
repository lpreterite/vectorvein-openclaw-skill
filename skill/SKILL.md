---
name: vectorvein
description: Run Vectorvein Open API workflows from chat via /vectorvein using a single config-driven Node.js dispatcher. Users add workflows after install (no built-in workflow IDs in repo).
metadata: {"openclaw":{"emoji":"🔌","skillKey":"vectorvein","requires":{"bins":["node"],"env":["VECTORVEIN_API_KEY"]}}}
---

# /vectorvein (Vectorvein Open API)

## Command

- `/vectorvein run <workflowKey> <jsonArgs>`

## Workflow config (user-defined)

Workflow definitions live in `{baseDir}/scripts/workflows.json` (user-created).

First install:
- This repo ships `{baseDir}/scripts/workflows.sample.json` only.
- Create `{baseDir}/scripts/workflows.json` by copying a workflow's **API access cURL** from Vectorvein and mapping inputs.

See: `{baseDir}/workflows.md`

## Execution

- Runs: `{baseDir}/scripts/vectorvein_api_dispatch.mjs run <workflowKey> '<jsonArgs>'`
- Requires env: `VECTORVEIN_API_KEY`
