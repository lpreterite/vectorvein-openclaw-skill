#!/usr/bin/env node
/**
 * Vectorvein Open API dispatcher (config-driven).
 *
 * - Reads workflow definitions from ./workflows.json
 * - Reads API key from env: VECTORVEIN_API_KEY
 * - Reads API version/baseUrl from env (optional):
 *   - VECTORVEIN_API_VERSION (default from workflows.json)
 *   - VECTORVEIN_API_BASE_URL (default from workflows.json)
 *
 * Usage:
 *   node vectorvein_api_dispatch.mjs run <workflowKey> '<jsonArgs>'
 *
 * Examples:
 *   node vectorvein_api_dispatch.mjs run bili_video_transcript '{"url_or_bvid":"https://b23.tv/..."}'
 *   node vectorvein_api_dispatch.mjs run summarize_meeting_audio '{"text":"...","files":[]}'
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function die(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function buildInputFields(def, argsObj) {
  const inputs = def.inputs || {};
  const inputFields = [];

  for (const [argName, spec] of Object.entries(inputs)) {
    if (!(argName in argsObj)) continue;
    inputFields.push({
      node_id: spec.node_id,
      field_name: spec.field_name,
      value: argsObj[argName],
    });
  }

  // Require that at least one input field is provided
  if (inputFields.length === 0) {
    die(
      `No recognized input fields provided. Expected one of: ${Object.keys(inputs).join(', ')}`
    );
  }

  return inputFields;
}

async function postJson(url, headers, body) {
  // Node fetch may be blocked by upstream WAF/CDN even when curl works.
  // Use curl for maximum compatibility.
  const payload = JSON.stringify(body);
  const curlArgs = [
    'curl',
    '-sS',
    '--max-time',
    String(Math.ceil((Number(process.env.VECTORVEIN_HTTP_TIMEOUT_MS || '60')))),
    '-X',
    'POST',
    url,
    ...Object.entries({
      ...headers,
      'Content-Type': 'application/json',
    }).flatMap(([k, v]) => ['-H', `${k}: ${v}`]),
    '-d',
    payload,
  ];

  const { spawnSync } = await import('node:child_process');
  const proc = spawnSync(curlArgs[0], curlArgs.slice(1), { encoding: 'utf-8' });
  const stdout = proc.stdout || '';
  const stderr = proc.stderr || '';
  const exitCode = proc.status ?? 1;

  // curl non-zero -> treat as failure
  if (exitCode !== 0) {
    return { ok: false, status: 0, body: { raw: stderr || stdout, exitCode } };
  }

  let json;
  try {
    json = JSON.parse(stdout);
  } catch {
    json = { raw: stdout };
  }

  // Vectorvein API uses JSON {status, msg, data}; interpret status when present.
  const apiStatus = typeof json?.status === 'number' ? json.status : 200;
  if (apiStatus !== 200) {
    return { ok: false, status: apiStatus, body: json };
  }

  return { ok: true, status: apiStatus, body: json };
}

async function main() {
  const [, , cmd, workflowKey, jsonArgs] = process.argv;
  if (cmd !== 'run') {
    die('Usage: vectorvein_api_dispatch.mjs run <workflowKey> <jsonArgs>');
  }
  if (!workflowKey) die('Missing <workflowKey>');
  if (!jsonArgs) die('Missing <jsonArgs>');

  let argsObj;
  try {
    argsObj = JSON.parse(jsonArgs);
  } catch (e) {
    die(`Invalid JSON args: ${e?.message || e}`);
  }

  const apiKey = (process.env.VECTORVEIN_API_KEY || '').trim();
  if (!apiKey) {
    die('Missing VECTORVEIN_API_KEY in environment. Configure it via OpenClaw skill env injection (keep keys out of the repo).');
  }

  const baseDir = path.dirname(new URL(import.meta.url).pathname);
  // Users define their own workflows after installing the skill.
  // Prefer workflows.json; fall back to workflows.sample.json for first-run guidance.
  const workflowsPath = path.join(baseDir, 'workflows.json');
  const samplePath = path.join(baseDir, 'workflows.sample.json');
  const configPath = fs.existsSync(workflowsPath) ? workflowsPath : samplePath;
  const cfg = readJson(configPath);

  const def = cfg.workflows?.[workflowKey];
  if (!def) {
    die(`Unknown workflowKey: ${workflowKey}. Available: ${Object.keys(cfg.workflows || {}).join(', ')}`);
  }

  const baseUrl = (process.env.VECTORVEIN_API_BASE_URL || cfg.api?.baseUrl || '').replace(/\/$/, '');
  const apiVersion = (process.env.VECTORVEIN_API_VERSION || cfg.api?.version || '').trim();
  if (!baseUrl) die('Missing api.baseUrl in workflows.json and VECTORVEIN_API_BASE_URL not set');
  if (!apiVersion) die('Missing api.version in workflows.json and VECTORVEIN_API_VERSION not set');

  const input_fields = buildInputFields(def, argsObj);

  const payload = {
    wid: def.wid,
    // Allow per-call overrides via jsonArgs
    output_scope: (argsObj.output_scope ?? def.output_scope ?? 'output_fields_only'),
    wait_for_completion: (argsObj.wait_for_completion ?? def.wait_for_completion ?? false),
    input_fields,
  };

  const url = `${baseUrl}/workflow/run`;
  const headers = {
    'VECTORVEIN-API-KEY': apiKey,
    'VECTORVEIN-API-VERSION': apiVersion,
  };

  const result = await postJson(url, headers, payload);
  // Always print JSON for OpenClaw to relay.
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) process.exit(1);
}

await main();
