# Workflow 配置指南

> → 首次配置时加载

## Step 1 — 获取 cURL 示例

1) 打开 VectorVein → 进入你的 workflow
2) 找到 **API 访问 / API Access**
3) 复制 cURL 示例

## Step 2 — 创建 workflows.json

```bash
cp {baseDir}/scripts/workflows.sample.json {baseDir}/scripts/workflows.json
```

编辑 `workflows.json`，填入从 cURL 示例中提取的值：
- `wid` — workflow ID
- `node_id` — 节点 ID（每个 input field 下）
- `field_name` — 字段名（每个 input field 下）

## Step 3 — 测试

```bash
node {baseDir}/scripts/vectorvein_api_dispatch.mjs run bili_video_transcript '{"url_or_bvid":"https://b23.tv/..."}'
```

或使用 poll 模式（推荐用于视频转写）：

```bash
node {baseDir}/scripts/vectorvein_api_dispatch.mjs poll bili_video_transcript '{"url_or_bvid":"https://b23.tv/..."}'
```

## ⚠️ 重要

- `wait_for_completion` 始终为 `false`（CDN 30s 超时）
- 长时任务使用 `poll` 命令，不要用 `run` + 手动轮询
- `workflows.json` 不要提交到 git（已在 .gitignore 中）
