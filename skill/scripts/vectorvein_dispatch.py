#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dispatch Vectorvein MCP tool calls using mcporter and env-injected credentials.

This is designed to be invoked from an OpenClaw skill (/vectorvein ...) where
VECTORVEIN_MCP_KEY and VECTORVEIN_MCP_SERVER_ID are provided via openclaw.json
(skills.entries.vectorvein -> env section).

It avoids relying on ~/.mcporter/mcporter.json by using mcporter ad-hoc --http-url.

Usage:
  vectorvein_dispatch.py bili_video2podcast '{"url_or_bvid":"BV..."}'
  vectorvein_dispatch.py nano_banana_image_generate '{"prompt":"...","aspect_ratio":"16:9"}'
  vectorvein_dispatch.py summarize_meeting_audio '{"text":"...","files":["/path/a.m4a"],"show_download":true}'

Outputs:
  Prints mcporter output (json) to stdout.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from typing import Any

ALIAS_TO_TOOL = {
    "bili_video2podcast": "video2podcast_mapper",
    "nano_banana_image_generate": "anana",
    "summarize_meeting_audio": "🗃️ 会议音频总结",
}


def build_base_url() -> str:
    key = os.environ.get("VECTORVEIN_MCP_KEY", "").strip()
    server_id = os.environ.get("VECTORVEIN_MCP_SERVER_ID", "").strip()
    if not key or not server_id:
        raise SystemExit(
            "Missing VECTORVEIN_MCP_KEY or VECTORVEIN_MCP_SERVER_ID in environment. "
            "Set them in ~/.openclaw/openclaw.json under skills.entries.vectorvein.envVars (VECTORVEIN_MCP_KEY / VECTORVEIN_MCP_SERVER_ID)."
        )
    return f"https://mcp.vectorvein.com/sse?key={key}&server_id={server_id}"


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: vectorvein_dispatch.py <subcommand> <json_args>", file=sys.stderr)
        return 2

    subcmd = argv[0]
    json_args = argv[1]

    tool = ALIAS_TO_TOOL.get(subcmd)
    if not tool:
        print(f"Unknown subcommand: {subcmd}. Choose from: {', '.join(ALIAS_TO_TOOL)}", file=sys.stderr)
        return 2

    try:
        payload: dict[str, Any] = json.loads(json_args)
    except Exception as e:
        print(f"Invalid JSON args: {e}", file=sys.stderr)
        return 2

    base_url = build_base_url()

    # Use ad-hoc HTTP URL + explicit tool name.
    # Use JSON output to avoid locale/format variance.
    cmd = [
        "mcporter",
        "call",
        "--http-url",
        base_url,
        "--tool",
        tool,
        "--args",
        json.dumps(payload, ensure_ascii=False),
        "--output",
        "json",
    ]

    proc = subprocess.run(cmd, text=True)
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
