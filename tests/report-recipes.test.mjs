import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

const cleanups = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

// Run the helper exactly as documented, so the test fails when the recipe agents
// copy drifts rather than when a private reimplementation does.
const newRound = readFileSync(
  new URL('../skills/acceptance/references/report.md', import.meta.url),
  'utf8',
).match(/^new_round\(\) \{\n[\s\S]*?^\}$/m)?.[0];

function repo() {
  const root = mkdtempSync(path.join(tmpdir(), 'acceptance recipe '));
  cleanups.push(() => rmSync(root, { force: true, recursive: true }));
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}

const sh = (cwd, script) =>
  execFileSync('/bin/bash', ['-c', `${newRound}\n${script}`], { cwd, encoding: 'utf8' });
const status = (cwd) =>
  execFileSync('git', ['status', '--short', '--untracked-files=all'], {
    cwd,
    encoding: 'utf8',
  });

test('report.md documents a new_round helper', () => {
  assert.ok(newRound, 'new_round() block not found in references/report.md');
});

test('a hand-written round stays out of git status in a fresh repository', () => {
  const root = repo();
  const dir = sh(root, 'new_round standalone-demo first-pass');

  assert.match(dir, /^\.acceptances\/standalone-demo\/\d{8}-\d{6}-first-pass$/);
  assert.equal(readFileSync(path.join(root, '.acceptances/.gitignore'), 'utf8'), '*\n');
  for (const file of ['result.json', 'report.md', 'proposal.md', 'assets/shot.png']) {
    writeFileSync(path.join(root, dir, file), 'x');
  }
  writeFileSync(path.join(root, '.acceptances/standalone-demo/acceptance.json'), '{}');

  assert.equal(status(root), '');
  assert.equal(existsSync(path.join(root, '.gitignore')), false);
});

test('new_round keeps an existing ignore file and earlier rounds', () => {
  const root = repo();
  writeFileSync(path.join(root, '.gitignore'), 'node_modules\n');
  const first = sh(root, 'new_round topic-tpc_x first-pass');
  writeFileSync(path.join(root, first, 'result.json'), '{"keep":true}');
  writeFileSync(path.join(root, '.acceptances/.gitignore'), '*\n# project note\n');

  sh(root, 'new_round topic-tpc_x repair');

  assert.equal(
    readFileSync(path.join(root, '.acceptances/.gitignore'), 'utf8'),
    '*\n# project note\n',
  );
  assert.equal(readFileSync(path.join(root, first, 'result.json'), 'utf8'), '{"keep":true}');
  assert.equal(readFileSync(path.join(root, '.gitignore'), 'utf8'), 'node_modules\n');
  assert.equal(status(root), '?? .gitignore\n');
});

test('new_round fails without a directory when the ignore file cannot be written', (t) => {
  if (process.getuid?.() === 0) return t.skip('root ignores directory permissions');
  const root = repo();
  mkdirSync(path.join(root, '.acceptances/standalone-demo'), { recursive: true });
  chmodSync(path.join(root, '.acceptances'), 0o555);
  cleanups.push(() => chmodSync(path.join(root, '.acceptances'), 0o755));

  const result = spawnSync(
    '/bin/bash',
    ['-c', `${newRound}\nnew_round standalone-demo first-pass`],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );

  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
});
