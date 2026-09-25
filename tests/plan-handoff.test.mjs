import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const operationId = "operation-from-invocation";
const runId = "cf6a8660-27d8-43d0-b615-0453515393a0";
const acceptanceId = "d9a8b4d7-30ee-42c9-8f88-4790a8e474ca";
const attachedRun = { id: runId, operationId, acceptanceId, roundIndex: 3 };
const commands = [
  ["doctor", "--offline", "--json"],
  ["verify", "plan", "state", operationId, "--json"],
  ["acceptance", "run", "get", runId, "--json"],
];

// Execute the published example with only the read-only CLI boundary substituted.
function handoff(t, options = {}) {
  const markdown = readFileSync(
    new URL("../skills/acceptance/references/plan-format.md", import.meta.url),
    "utf8",
  );
  const code = markdown.match(
    /node - "\$OPERATION_ID" <<'NODE'\n([\s\S]*?)\nNODE/,
  );
  assert.ok(
    code,
    "The operation-plan path must document an executable handoff lookup",
  );
  const dir = mkdtempSync(path.join(tmpdir(), "acceptance plan handoff "));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const fixtures = {
    run: attachedRun,
    state: {
      verifyRunId: runId,
      verifyPlan: [{ verifierConfig: { requiredEvidence: [] } }],
    },
    server: "https://app.lobehub.com",
    doctorExit: 0,
    endpointStatus: "ok",
    lookupExit: 0,
    ...options,
  };
  writeFileSync(path.join(dir, "fixtures.json"), JSON.stringify(fixtures));
  writeFileSync(
    path.join(dir, "lh"),
    `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.HANDOFF_CALLS, JSON.stringify(args) + '\\n');
const fixture = JSON.parse(fs.readFileSync(process.env.HANDOFF_FIXTURES, 'utf8'));
const command = ${JSON.stringify(commands)}.findIndex((value) => JSON.stringify(value) === JSON.stringify(args));
if (command === 0) {
  console.log(JSON.stringify({ checks: [{ id: 'endpoints.resolution', status: fixture.endpointStatus, evidence: { serverUrl: fixture.server } }] }));
  process.exit(fixture.doctorExit);
} else if (command === 1) {
  console.log(JSON.stringify(fixture.state));
} else if (command === 2) {
  if (fixture.lookupExit) process.exit(fixture.lookupExit);
  console.log(JSON.stringify(fixture.run));
} else {
  throw new Error('Unexpected CLI command: ' + JSON.stringify(args));
}
`,
    { mode: 0o755 },
  );
  const result = spawnSync(process.execPath, ["-", operationId], {
    input: code[1],
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${dir}${path.delimiter}${process.env.PATH}`,
      HANDOFF_CALLS: path.join(dir, "calls.jsonl"),
      HANDOFF_FIXTURES: path.join(dir, "fixtures.json"),
    },
  });
  const calls = readFileSync(path.join(dir, "calls.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.deepEqual(calls, commands.slice(0, calls.length));
  if (result.status === 0) assert.equal(calls.length, commands.length);
  return result;
}

for (const server of [
  "https://app.lobehub.com",
  "http://localhost:3010/base/",
]) {
  test(`text-only plan resolves links without a submission response: ${server}`, (t) => {
    const result = handoff(t, { server });
    assert.equal(result.status, 0, result.stderr);
    const url = `${new URL(server).origin}/acceptance/${acceptanceId}`;
    assert.deepEqual(JSON.parse(result.stdout), {
      acceptanceId,
      verifyRunId: runId,
      roundIndex: 3,
      acceptanceUrl: url,
    });
  });
}

test("artifact plans use the same lookup without resubmitting evidence", (t) => {
  const result = handoff(t, {
    state: {
      verifyRunId: runId,
      verifyPlan: [
        { verifierConfig: { requiredEvidence: [{ type: "screenshot" }] } },
      ],
    },
  });
  assert.equal(result.status, 0, result.stderr);
});

test("unrelated doctor failures do not discard a resolved server", (t) => {
  const result = handoff(t, { doctorExit: 1, endpointStatus: "warn" });
  assert.equal(result.status, 0, result.stderr);
});

for (const [name, options] of [
  ["unresolved server", { server: null }],
  ["missing operation state", { state: null }],
  [
    "unattached run",
    { run: { ...attachedRun, acceptanceId: null, roundIndex: null } },
  ],
  ["missing run", { run: null }],
  ["different run", { run: { ...attachedRun, id: "another-run" } }],
  [
    "different operation",
    { run: { ...attachedRun, operationId: "another-operation" } },
  ],
  ["missing round index", { run: { ...attachedRun, roundIndex: null } }],
]) {
  test(`plan handoff refuses ${name} without printing a fabricated link`, (t) => {
    const result = handoff(t, options);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Handoff blocked/);
  });
}

test("plan handoff propagates a failed CLI lookup without publishing a link", (t) => {
  const result = handoff(t, { lookupExit: 1 });
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
});
