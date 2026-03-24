# Vectorvein workflows: user-defined config

This skill is intentionally **config-driven**: after installing, you add your own workflows.

## Step 1 — Get the cURL example from Vectorvein

1) Open Vectorvein → the workflow you want to call.
2) Find **API 访问 / API Access**.
3) Copy the **cURL** example.

You will see something like:

```bash
curl -X POST "https://vectorvein.com/api/v1/open-api/workflow/run" \
  -H "VECTORVEIN-API-KEY: ..." \
  -H "VECTORVEIN-API-VERSION: 20240508" \
  -H "Content-Type: application/json" \
  -d '{
    "wid": "<WID>",
    "wait_for_completion": false,
    "input_fields": [
      {"node_id":"<NODE>","field_name":"url_or_bvid","value":"..."}
    ]
  }'
```

## Step 2 — Create workflows.json (copy the sample)

Create `{baseDir}/scripts/workflows.json` by copying `workflows.sample.json` and filling in:

- `wid` (from the cURL body)
- each input field's `node_id` and `field_name`

Example skeleton:

```json
{
  "api": {
    "baseUrl": "https://vectorvein.com/api/v1/open-api",
    "version": "20240508"
  },
  "workflows": {
    "my_workflow_key": {
      "title": "My workflow",
      "wid": "<YOUR_WID>",
      "wait_for_completion": false,
      "output_scope": "output_fields_only",
      "inputs": {
        "url_or_bvid": {"node_id": "<YOUR_NODE_ID>", "field_name": "url_or_bvid"}
      }
    }
  }
}
```

## Step 3 — Call from chat

```text
/vectorvein run my_workflow_key {"url_or_bvid":"https://b23.tv/...","wait_for_completion":true}
```

## Agent guidance (important)

When you add a new workflow key, **also update the skill description / docs** to mention:

- The new `workflowKey`
- Required args
- Any recommended defaults (e.g. `wait_for_completion:true`)

This helps the Agent choose the correct key and args.
