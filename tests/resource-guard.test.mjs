import assert from 'node:assert/strict';
import { execFile, execFileSync, spawn } from 'node:child_process';
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
// Create it once before starting a watcher and reuse the returned environment:
// rewriting these scripts while sampling can expose empty files to the watcher.
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

const childrenOf = (pid) =>
  execFileSync('ps', ['-Ao', 'pid=,ppid='], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter(([, parent]) => Number(parent) === pid)
    .map(([child]) => Number(child));

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

test('check enforces the advertised total.rss threshold', async () => {
  const { root, scripts } = project();
  const guard = path.join(scripts, 'resource-guard.sh');
  const sleeper = track(spawn('sleep', ['917'], { stdio: 'ignore' }).pid);
  assert.ok(alive(sleeper));

  // A threshold the operator configured is never ignored, even with no group: the
  // summed RSS of no declared groups is 0, and 0 still meets total.rss=0.
  const bare = await run(guard, ['check', '--json', '--red', 'total.rss=0'], host(root));
  assert.equal(bare.code, 20, bare.stdout + bare.stderr);
  const bareOutput = JSON.parse(bare.stdout.trim());
  assert.equal(typeof bareOutput.totalRssMb, 'number', JSON.stringify(bareOutput));
  assert.equal(bareOutput.breaches.find((entry) => entry.metric === 'total.rss')?.tier, 'red');

  const red = await run(
    guard,
    ['check', '--json', '--group', 'sleeper=sleep 917', '--red', 'total.rss=0'],
    host(root),
  );
  assert.equal(red.code, 20, red.stdout + red.stderr);
  const redOutput = JSON.parse(red.stdout.trim());
  assert.equal(redOutput.breaches.find((entry) => entry.metric === 'total.rss')?.tier, 'red');

  const green = await run(
    guard,
    ['check', '--json', '--group', 'sleeper=sleep 917', '--red', 'total.rss=100000'],
    host(root),
  );
  assert.equal(green.code, 0, green.stdout + green.stderr);

  const yellow = await run(
    guard,
    ['check', '--json', '--group', 'sleeper=sleep 917', '--yellow', 'total.rss=0'],
    host(root),
  );
  assert.equal(yellow.code, 10, yellow.stdout + yellow.stderr);
});

test('stop-owned never stops a process this run did not start', async () => {
  const { root, scripts } = project();
  const guard = path.join(scripts, 'resource-guard.sh');
  const state = path.join(root, 'guard-state');
  const env = host(root, { swap: SWAP(30000) });
  const preExisting = track(spawn('sleep', ['733'], { stdio: 'ignore' }).pid);
  await new Promise((resolve) => setTimeout(resolve, 300));

  const started = await run(
    guard,
    [
      'start', '--state-dir', state, '--run-tag', 'run-owned', '--interval', '1', '--grace', '1',
      '--group', 'pre=sleep 733', '--group', 'late=sleep 734',
      '--red', 'swap=0', '--on-red', 'stop-owned',
    ],
    env,
  );
  assert.equal(started.code, 0, started.stdout + started.stderr);

  // A sibling run's server: it appears after our first sample, but nothing ever tied
  // it to this run. Appearing later must not be enough to enter our kill set.
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const latecomer = track(spawn('sleep', ['734'], { stdio: 'ignore' }).pid);

  // Two more red samples pass with the latecomer visible.
  await new Promise((resolve) => setTimeout(resolve, 2500));
  assert.equal(alive(latecomer), true, 'a process this run never started must survive');
  assert.equal(alive(preExisting), true, 'a pre-existing process must never be stopped');

  const events = readFileSync(path.join(state, 'events.jsonl'), 'utf8');
  assert.doesNotMatch(events, /"event":"stop-owned"/, events);

  const stopped = await run(guard, ['stop', '--state-dir', state], env);
  assert.equal(stopped.code, 0, stopped.stdout + stopped.stderr);
});

test('stop-owned stops what the run tagged, claimed, or claimed the parent of', async () => {
  const { root, scripts } = project();
  const guard = path.join(scripts, 'resource-guard.sh');
  const state = path.join(root, 'guard-state');
  const env = host(root, { swap: SWAP(30000) });
  const preExisting = track(spawn('sleep', ['733'], { stdio: 'ignore' }).pid);
  await new Promise((resolve) => setTimeout(resolve, 300));

  const started = await run(
    guard,
    [
      'start', '--state-dir', state, '--run-tag', 'run-owned', '--interval', '1', '--grace', '1',
      '--group', 'pre=sleep 733',
      '--group', 'late=sleep 734',
      '--group', 'claimed=sleep 736',
      '--group', 'tagged=RUN_TAG=run-owned',
      '--group', 'desc=sleep 738',
      '--red', 'swap=0', '--on-red', 'stop-owned',
    ],
    env,
  );
  assert.equal(started.code, 0, started.stdout + started.stderr);

  await new Promise((resolve) => setTimeout(resolve, 1200));
  const latecomer = track(spawn('sleep', ['734'], { stdio: 'ignore' }).pid);
  const claimed = track(spawn('sleep', ['736'], { stdio: 'ignore' }).pid);
  const tagged = track(
    spawn('/bin/sh', ['-c', 'RUN_TAG=run-owned; while :; do sleep 1; done'], { stdio: 'ignore' }).pid,
  );

  const claim = await run(guard, ['claim', '--state-dir', state, '--pid', String(claimed)], env);
  assert.equal(claim.code, 0, claim.stdout + claim.stderr);

  // A claimed process brings its children: the dev server this run started is owned
  // even when the pattern also matches the shell that launched it. The trailing `:`
  // keeps the shell from exec-ing the sleep away, so there is a real child.
  const parent = track(spawn('/bin/sh', ['-c', 'sleep 738; :'], { stdio: 'ignore' }).pid);
  assert.ok(await waitFor(() => childrenOf(parent).length > 0), 'the shell must have a child');
  const child = track(childrenOf(parent)[0]);
  const claimParent = await run(guard, ['claim', '--state-dir', state, '--pid', String(parent)], env);
  assert.equal(claimParent.code, 0, claimParent.stdout + claimParent.stderr);

  await waitFor(() => !alive(claimed) && !alive(tagged) && !alive(child));
  assert.equal(alive(claimed), false, 'a claimed process must be stopped');
  assert.equal(alive(tagged), false, 'a process carrying the run tag must be stopped');
  assert.equal(alive(child), false, "a claimed process's child must be stopped");
  assert.equal(alive(latecomer), true, 'a process this run never claimed or tagged must survive');
  assert.equal(alive(preExisting), true, 'a pre-existing process must never be stopped');

  const events = readFileSync(path.join(state, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const stops = events.filter((event) => event.event === 'stop-owned');
  assert.ok(stops.some((event) => event.signal === 'TERM'), JSON.stringify(events));
  assert.deepEqual(
    [...new Set(stops.map((event) => event.group))].sort(),
    ['claimed', 'desc', 'tagged'],
    JSON.stringify(events),
  );

  const status = await run(guard, ['status', '--state-dir', state, '--json'], env);
  assert.equal(status.code, 0, status.stdout + status.stderr);
  const summary = JSON.parse(status.stdout.trim());
  assert.equal(summary.running, true);
  assert.ok(summary.samples > 0);
  assert.equal(summary.red, summary.samples);
  assert.equal(summary.yellow, 0);

  const stopped = await run(guard, ['stop', '--state-dir', state], env);
  assert.equal(stopped.code, 0, stopped.stdout + stopped.stderr);
});

test('every guard invocation in the reference carries the flags its mode needs', () => {
  const doc = readFileSync(
    new URL('../skills/acceptance/references/resource-guard.md', import.meta.url),
    'utf8',
  );
  // The reference spells the script as $GUARD; resolve it so a documented command
  // line can be checked the way a reader would copy it.
  const resolved = doc.replace(/^GUARD=.*$/gm, '').replace(/\$GUARD/g, 'resource-guard.sh');
  const required = {
    check: [],
    start: ['--state-dir'],
    claim: ['--state-dir', '--pid'],
    status: ['--state-dir'],
    stop: ['--state-dir'],
  };
  const invocations = resolved
    .replace(/\\\n\s*/g, ' ')
    .split('\n')
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /resource-guard\.sh["']?\s+(check|start|claim|stop|status)\b/.test(line));
  assert.ok(invocations.length >= 4, 'the reference must still show a run and a teardown');
  for (const { line } of invocations) {
    const mode = line.match(/resource-guard\.sh["']?\s+(check|start|claim|stop|status)\b/)[1];
    for (const flag of required[mode]) {
      assert.ok(line.includes(flag), `${mode} example is missing ${flag}: ${line.trim()}`);
    }
  }
});

test('warn never signals a process', async () => {
  const { root, scripts } = project();
  const guard = path.join(scripts, 'resource-guard.sh');
  const state = path.join(root, 'guard-state');
  const env = host(root, { swap: SWAP(30000) });
  const sleeper = track(spawn('sleep', ['735'], { stdio: 'ignore' }).pid);
  const started = await run(
    guard,
    ['start', '--state-dir', state, '--interval', '1', '--group', 'own=sleep 735', '--red', 'swap=0'],
    env,
  );
  assert.equal(started.code, 0, started.stdout + started.stderr);
  await new Promise((resolve) => setTimeout(resolve, 2500));
  assert.equal(alive(sleeper), true, 'warn must leave processes running');
  const events = readFileSync(path.join(state, 'events.jsonl'), 'utf8');
  assert.match(events, /"action":"none"/);
  assert.doesNotMatch(events, /stop-owned/);
  await run(guard, ['stop', '--state-dir', state], env);
});
