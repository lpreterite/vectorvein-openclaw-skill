---
name: vectorvein
description: "通过 VectorVein Open API 执行工作流（submit + 异步轮询）。触发：视频转写、向量脉络、VectorVein API 调用、workflow submit/poll。"
metadata: {"openclaw":{"emoji":"🔌","skillKey":"vectorvein","requires":{"bins":["node"],"env":["VECTORVEIN_API_KEY"]}}}
---

# VectorVein Open API Dispatcher

通过 VectorVein Open API 提交工作流并获取结果。支持异步轮询，适用于视频转写等长时任务。

**触发场景**：视频转写、向量脉络工作流调用、VectorVein API 操作

## 前置确认 [自由度：低]

1. 检查 `VECTORVEIN_API_KEY` 环境变量是否已配置
2. 检查 `~/.openclaw/skills/vectorvein/scripts/workflows.json` 是否存在（非 sample）

配置方式（三选一）：
- `openclaw.json` → `skills.entries.vectorvein.env.VECTORVEIN_API_KEY`（subagent 生效）
- `~/.zshrc` → `export VECTORVEIN_API_KEY=...`（CLI 直接调用生效）
- 内联：`VECTORVEIN_API_KEY=... node ...`（一次性测试）

首次配置：运行 `node {baseDir}/scripts/vectorvein_api_dispatch.mjs setup` 查看引导。

## 命令

### 1. `run` — 提交工作流 [自由度：中]

```bash
node {baseDir}/scripts/vectorvein_api_dispatch.mjs run <workflowKey> '<jsonArgs>'
```

仅提交，不等待结果。返回 task_id，适合 Agent 后续自行轮询。

### 2. `poll` — 提交 + 轮询 [自由度：低]

```bash
node {baseDir}/scripts/vectorvein_api_dispatch.mjs poll <workflowKey> '<jsonArgs>'
```

提交后自动每 10s 轮询 check-status，直到完成或超时（默认 10min）。
⚠️ **这是视频转写的推荐命令**——`wait_for_completion` 因 CDN 30s 超时不可靠，始终使用 poll。

可配置环境变量：
- `VECTORVEIN_POLL_INTERVAL_MS` — 轮询间隔（默认 10000ms）
- `VECTORVEIN_POLL_MAX_MS` — 最大轮询时长（默认 600000ms）

## Workflow 配置

→ 此时加载 {baseDir}/workflows.md

用户自定义 workflow 定义在 `{baseDir}/scripts/workflows.json`。

## 失败回退

| 失败场景 | 回退动作 |
|---------|---------|
| VECTORVEIN_API_KEY 未配置 | 参见"前置确认"章节 |
| workflows.json 不存在 | 运行 `setup` 命令创建 |
| submit 返回非 200 | 检查 WID/NODE_ID 是否正确 |
| poll 超时（10min） | 到向量脉络网页端查看任务状态 |
| poll 返回 failed | 检查输入参数和 API 额度 |
| CDN 超时（524） | 已通过 poll 模式规避，若仍出现则降低并发 |

## 完成标准

- `run`：返回 `{ok: true, body: {data: {id: ...}}}`
- `poll`：返回 `{ok: true, body: {data: {status: "completed", ...}}}`
