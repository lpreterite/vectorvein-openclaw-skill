#!/usr/bin/env node
/**
 * Vectorvein Open API dispatcher (config-driven).
 *
 * Commands:
 *   run   <workflowKey> <jsonArgs>  — submit a workflow (fire-and-forget)
 *   poll  <workflowKey> <jsonArgs>  — submit + poll check-status until done
 *   setup                        — print first-run setup instructions
 *
 * Env:
 *   VECTORVEIN_API_KEY        (required) API key
 *   VECTORVEIN_API_VERSION    (optional) defaults to workflows.json api.version
 *   VECTORVEIN_API_BASE_URL   (optional) defaults to workflows.json api.baseUrl
 *   VECTORVEIN_HTTP_TIMEOUT_MS (optional) default 60s per request
 *   VECTORVEIN_POLL_INTERVAL_MS (optional) default 10000ms between polls
 *   VECTORVEIN_POLL_MAX_MS      (optional) default 600000ms (10min) total poll timeout
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

/** Remove control characters that break JSON.parse */
function sanitizeJson(str) {
  return str.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
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

  if (inputFields.length === 0) {
    die(
      `No recognized input fields provided. Expected one of: ${Object.keys(inputs).join(', ')}`
    );
  }

  return inputFields;
}

async function httpRequest(method, url, headers, body) {
  const { spawnSync } = await import('node:child_process');
  const curlArgs = ['curl', '-sS', '--max-time', String(Math.ceil(Number(process.env.VECTORVEIN_HTTP_TIMEOUT_MS || '60'))), '-X', method, url];

  for (const [k, v] of Object.entries({ ...headers, 'Content-Type': 'application/json' })) {
    curlArgs.push('-H', `${k}: ${v}`);
  }
  if (body !== undefined) {
    curlArgs.push('-d', JSON.stringify(body));
  }

  const proc = spawnSync(curlArgs[0], curlArgs.slice(1), { encoding: 'utf-8' });
  const stdout = proc.stdout || '';
  const stderr = proc.stderr || '';
  const exitCode = proc.status ?? 1;

  if (exitCode !== 0) {
    return { ok: false, status: 0, body: { raw: stderr || stdout, exitCode } };
  }

  let json;
  try {
    json = JSON.parse(sanitizeJson(stdout));
  } catch {
    json = { raw: stdout };
  }

  const apiStatus = typeof json?.status === 'number' ? json.status : 200;
  if (apiStatus !== 200) {
    return { ok: false, status: apiStatus, body: json };
  }

  return { ok: true, status: apiStatus, body: json };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function loadConfig() {
  const apiKey = (process.env.VECTORVEIN_API_KEY || '').trim();
  if (!apiKey) {
    die('Missing VECTORVEIN_API_KEY. Configure it via:\n' +
        '  1. openclaw.json → skills.entries.vectorvein.env.VECTORVEIN_API_KEY\n' +
        '  2. ~/.zshrc → export VECTORVEIN_API_KEY=...\n' +
        '  3. Inline: VECTORVEIN_API_KEY=... node ...');
  }

  const baseDir = path.dirname(new URL(import.meta.url).pathname);
  const workflowsPath = path.join(baseDir, 'workflows.json');
  const samplePath = path.join(baseDir, 'workflows.sample.json');

  if (!fs.existsSync(workflowsPath)) {
    die(`workflows.json not found at ${workflowsPath}.\n` +
        'Run "node vectorvein_api_dispatch.mjs setup" for instructions.');
  }

  const cfg = readJson(workflowsPath);
  const baseUrl = (process.env.VECTORVEIN_API_BASE_URL || cfg.api?.baseUrl || '').replace(/\/$/, '');
  const apiVersion = (process.env.VECTORVEIN_API_VERSION || cfg.api?.version || '').trim();

  if (!baseUrl) die('Missing api.baseUrl in workflows.json');
  if (!apiVersion) die('Missing api.version in workflows.json');

  const headers = {
    'VECTORVEIN-API-KEY': apiKey,
    'VECTORVEIN-API-VERSION': apiVersion,
  };

  return { cfg, baseUrl, headers };
}

// --- Commands ---

async function cmdRun(workflowKey, argsObj) {
  const { cfg, baseUrl, headers } = loadConfig();

  const def = cfg.workflows?.[workflowKey];
  if (!def) {
    die(`Unknown workflowKey: ${workflowKey}. Available: ${Object.keys(cfg.workflows || {}).join(', ')}`);
  }

  const input_fields = buildInputFields(def, argsObj);

  const payload = {
    wid: def.wid,
    output_scope: argsObj.output_scope ?? def.output_scope ?? 'output_fields_only',
    // ⚠️ wait_for_completion is unreliable due to CDN 30s timeout.
    // Always use false and poll instead.
    wait_for_completion: false,
    input_fields,
  };

  const result = await httpRequest('POST', `${baseUrl}/workflow/run`, headers, payload);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

async function cmdPoll(workflowKey, argsObj) {
  const { cfg, baseUrl, headers } = loadConfig();

  const def = cfg.workflows?.[workflowKey];
  if (!def) {
    die(`Unknown workflowKey: ${workflowKey}. Available: ${Object.keys(cfg.workflows || {}).join(', ')}`);
  }

  const input_fields = buildInputFields(def, argsObj);

  // Step 1: Submit
  const submitPayload = {
    wid: def.wid,
    output_scope: argsObj.output_scope ?? def.output_scope ?? 'output_fields_only',
    wait_for_completion: false,
    input_fields,
  };

  console.error(`[poll] Submitting workflow ${workflowKey}...`);
  const submitResult = await httpRequest('POST', `${baseUrl}/workflow/run`, headers, submitPayload);

  if (!submitResult.ok) {
    console.error('[poll] Submit failed:');
    console.log(JSON.stringify(submitResult, null, 2));
    process.exit(1);
  }

  // Extract task/run ID from submit response
  const runId = submitResult.body?.data?.id || submitResult.body?.data?.run_id || submitResult.body?.data?.rid || submitResult.body?.run_id;
  if (!runId) {
    console.error('[poll] Submit succeeded but no run ID found in response. Response:');
    console.log(JSON.stringify(submitResult.body, null, 2));
    die('Cannot poll without a run ID. Check API response structure.');
  }

  console.error(`[poll] Submitted. Run ID: ${runId}. Polling check-status...`);

  // Step 2: Poll check-status
  const pollInterval = Number(process.env.VECTORVEIN_POLL_INTERVAL_MS || '10000');
  const pollMax = Number(process.env.VECTORVEIN_POLL_MAX_MS || '600000');
  const startTime = Date.now();

  while (true) {
    await sleep(pollInterval);
    const elapsed = Date.now() - startTime;

    if (elapsed > pollMax) {
      console.error(`[poll] Timeout after ${(elapsed / 1000).toFixed(0)}s (max ${pollMax / 1000}s).`);
      die('Poll timeout. Check VectorVein dashboard for task status.');
    }

    const checkResult = await httpRequest('POST', `${baseUrl}/workflow/check-status`, headers, { rid: runId });
    const taskStatus = checkResult.body?.msg;
    const taskHttp = checkResult.body?.status;

    console.error(`[poll] ${(elapsed / 1000).toFixed(0)}s — status: ${taskHttp || taskStatus || 'unknown'}`);

    // Terminal states
    if (taskStatus === 'FINISHED' || taskStatus === 'completed' || taskStatus === 'success') {
      console.log(JSON.stringify({ ok: true, status: 200, elapsed_ms: elapsed, body: checkResult.body }, null, 2));
      return;
    }

    if (taskStatus === 'FAILED' || taskHttp === 500) {
      console.error('[poll] Task failed.');
      console.log(JSON.stringify({ ok: false, status: 500, elapsed_ms: elapsed, body: checkResult.body }, null, 2));
      process.exit(1);
    }

    // Still processing (status 202 or empty msg)
    // continue polling
  }
}

function cmdSetup() {
  const baseDir = path.dirname(new URL(import.meta.url).pathname);
  const workflowsPath = path.join(baseDir, 'workflows.json');
  const samplePath = path.join(baseDir, 'workflows.sample.json');

  console.log(`
=== VectorVein Skill — First-time Setup ===

Step 1: Get your API key
  → https://vectorvein.com → Settings → API Key

Step 2: Get workflow IDs
  → Open the workflow in VectorVein
  → Click "API 访问 / API Access"
  → Copy the WID and NODE_ID from the cURL example

Step 3: Create workflows.json
  → Copy sample:  cp ${samplePath} ${workflowsPath}
  → Edit workflows.json, fill in:
     - wid: "<YOUR_WID>"
     - node_id: "<YOUR_NODE_ID>"  (under each input field)

Step 4: Configure API key (pick one):
  Option A (OpenClaw): add to openclaw.json → skills.entries.vectorvein.env.VECTORVEIN_API_KEY
  Option B (shell):    add to ~/.zshrc → export VECTORVEIN_API_KEY=...

Step 5: Test
  node ${path.join(baseDir, 'vectorvein_api_dispatch.mjs')} run <workflowKey> '{"arg":"value"}'

`);
}

// --- Main ---

async function main() {
  const [, , cmd, workflowKey, jsonArgs] = process.argv;

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log('Usage: vectorvein_api_dispatch.mjs <command> [args]\n\n' +
                'Commands:\n' +
                '  run   <workflowKey> <jsonArgs>  Submit workflow\n' +
                '  poll  <workflowKey> <jsonArgs>  Submit + poll until done\n' +
                '  setup                        Print setup instructions\n');
    process.exit(0);
  }

  if (cmd === 'setup') {
    cmdSetup();
    return;
  }

  if (cmd !== 'run' && cmd !== 'poll') {
    die(`Unknown command: ${cmd}. Use run, poll, or setup.`);
  }

  if (!workflowKey) die(`Missing <workflowKey>`);
  if (!jsonArgs) die(`Missing <jsonArgs>`);

  let argsObj;
  try {
    argsObj = JSON.parse(jsonArgs);
  } catch (e) {
    die(`Invalid JSON args: ${e?.message || e}`);
  }

  if (cmd === 'run') {
    await cmdRun(workflowKey, argsObj);
  } else {
    await cmdPoll(workflowKey, argsObj);
  }
}

await main();
