import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

const cleanups = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

// Materialize an install outside the repository, as `lh acceptance install` does.
function project() {
  const root = mkdtempSync(path.join(tmpdir(), 'acceptance guard '));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, '.agents/skills/acceptance/scripts');
  mkdirSync(scripts, { recursive: true });
  const source = new URL('../skills/acceptance/scripts/', import.meta.url);
  for (const name of readdirSync(source)) {
    writeFileSync(path.join(scripts, name), readFileSync(new URL(name, source)), { mode: 0o644 });
  }
  return { root, scripts };
}

// A stub host: uname/sysctl/vm_stat are fully faked, while ps, kill and the rest
// fall through to the real system so ownership can be exercised against real
// processes rather than a simulated table.
function host(root, options = {}) {
  const {
    platform = 'Darwin',
    swap = 'total = 31744.00M  used = 8000.00M  free = 23744.00M  (encrypted)',
    freePages = 400000,
    memsize = 17179869184,
  } = options;
  const bin = path.join(root, 'bin');
  mkdirSync(bin, { recursive: true });
  mkdirSync(path.join(root, 'tmp'), { recursive: true });
  const script = (name, body) =>
    writeFileSync(path.join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  script('uname', `echo '${platform}'`);
  script('sysctl', `case "$2" in vm.swapusage) echo '${swap}' ;; hw.memsize) echo ${memsize} ;; esac`);
  script(
    'vm_stat',
    `printf 'Mach Virtual Memory Statistics: (page size of 16384 bytes)\\nPages free: ${freePages}.\\nPages speculative: 0.\\n'`,
  );
  return { PATH: `${bin}${path.delimiter}${process.env.PATH}`, TMPDIR: path.join(root, 'tmp') };
}

function run(file, args, env = {}, timeout = 5000) {
  return new Promise((resolve) => {
    execFile(
      '/bin/bash',
      [file, ...args],
      { cwd: tmpdir(), env: { ...process.env, NODE_PATH: '', ...env }, timeout },
      (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }),
    );
  });
}

function track(pid) {
  cleanups.push(() => {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // already gone
    }
  });
  return pid;
}

async function waitFor(predicate, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return predicate();
}

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const SWAP = (usedMb) =>
  `total = 31744.00M  used = ${usedMb.toFixed(2)}M  free = ${(31744 - usedMb).toFixed(2)}M  (encrypted)`;

for (const [scenario, usedMb, tier, code, options] of [
  ['a low tier', 1000, 'green', 0, {}],
  ['a yellow tier', 23000, 'yellow', 10, {}],
  ['a red tier', 30000, 'red', 20, {}],
  ['an unknown pct when swap is not configured', 0, 'green', 0, { swap: SWAP(0) }],
]) {
  test(`check reports ${scenario} and exits ${code}`, async () => {
    const { root, scripts } = project();
    const result = await run(
      path.join(scripts, 'resource-guard.sh'),
      ['check', '--json'],
      host(root, { swap: SWAP(usedMb), ...options }),
    );
    assert.equal(result.code, code, result.stdout + result.stderr);
    const output = JSON.parse(result.stdout.trim());
    assert.equal(output.tier, tier);
    assert.equal(output.platform, 'Darwin');
    assert.deepEqual(output.groups, {});
  });
}

test('check measures a declared group and applies its own threshold', async () => {
  const { root, scripts } = project();
  const sleeper = track(spawn('sleep', ['917'], { stdio: 'ignore' }).pid);
  assert.ok(alive(sleeper));
  const result = await run(
    path.join(scripts, 'resource-guard.sh'),
    ['check', '--json', '--group', 'sleeper=sleep 917', '--red', 'group.sleeper.count=1'],
    host(root),
  );
  assert.equal(result.code, 20, result.stdout + result.stderr);
  const output = JSON.parse(result.stdout.trim());
  assert.ok(output.groups.sleeper.count >= 1, JSON.stringify(output.groups));
  assert.equal(output.breaches[0].metric, 'group.sleeper.count');
  assert.equal(output.breaches[0].tier, 'red');
});

test('check refuses an unsupported platform and unknown arguments', async () => {
  const { root, scripts } = project();
  const guard = path.join(scripts, 'resource-guard.sh');
  const unsupported = await run(guard, ['check', '--json'], host(root, { platform: 'Plan9' }));
  assert.equal(unsupported.code, 2);
  assert.match(unsupported.stderr, /Unsupported platform: Plan9/);
  const bad = await run(guard, ['check', '--nope'], host(root));
  assert.equal(bad.code, 2);
  assert.match(bad.stderr, /Unknown argument: --nope/);
});

test('stop-owned stops only the processes this run started', async () => {
  const { root, scripts } = project();
  const guard = path.join(scripts, 'resource-guard.sh');
  const state = path.join(root, 'guard-state');
  const preExisting = track(spawn('sleep', ['733'], { stdio: 'ignore' }).pid);
  await new Promise((resolve) => setTimeout(resolve, 300));

  const started = await run(
    guard,
    [
      'start', '--state-dir', state, '--run-tag', 'run-owned', '--interval', '1', '--grace', '1',
      '--group', 'pre=sleep 733', '--group', 'own=sleep 734',
      '--red', 'swap=0', '--on-red', 'stop-owned',
    ],
    host(root, { swap: SWAP(30000) }),
  );
  assert.equal(started.code, 0, started.stdout + started.stderr);

  await new Promise((resolve) => setTimeout(resolve, 1500));
  const owned = track(spawn('sleep', ['734'], { stdio: 'ignore' }).pid);

  await waitFor(() => !alive(owned));
  assert.equal(alive(owned), false, 'the run-owned process must be stopped');
  assert.equal(alive(preExisting), true, 'a pre-existing process must never be stopped');

  const events = readFileSync(path.join(state, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const stops = events.filter((event) => event.event === 'stop-owned');
  assert.ok(stops.some((event) => event.signal === 'TERM'), JSON.stringify(events));
  assert.ok(stops.every((event) => event.group === 'own'), JSON.stringify(events));

  const status = await run(guard, ['status', '--state-dir', state, '--json'], host(root));
  assert.equal(status.code, 0, status.stdout + status.stderr);
  const summary = JSON.parse(status.stdout.trim());
  assert.equal(summary.running, true);
  assert.ok(summary.samples > 0);
  assert.equal(summary.red, summary.samples);
  assert.equal(summary.yellow, 0);

  const stopped = await run(guard, ['stop', '--state-dir', state], host(root));
  assert.equal(stopped.code, 0, stopped.stdout + stopped.stderr);
});

test('warn never signals a process', async () => {
  const { root, scripts } = project();
  const guard = path.join(scripts, 'resource-guard.sh');
  const state = path.join(root, 'guard-state');
  const sleeper = track(spawn('sleep', ['735'], { stdio: 'ignore' }).pid);
  const started = await run(
    guard,
    ['start', '--state-dir', state, '--interval', '1', '--group', 'own=sleep 735', '--red', 'swap=0'],
    host(root, { swap: SWAP(30000) }),
  );
  assert.equal(started.code, 0, started.stdout + started.stderr);
  await new Promise((resolve) => setTimeout(resolve, 2500));
  assert.equal(alive(sleeper), true, 'warn must leave processes running');
  const events = readFileSync(path.join(state, 'events.jsonl'), 'utf8');
  assert.match(events, /"action":"none"/);
  assert.doesNotMatch(events, /stop-owned/);
  await run(guard, ['stop', '--state-dir', state], host(root));
});
