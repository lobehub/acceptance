import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildBundle } from './build-bundle.mjs';

const commit = 'a'.repeat(40);

test('bundles the skill version, all resource types, and source provenance', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'acceptance-bundle-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skillDir = path.join(root, 'skills/acceptance');
  const files = {
    'SKILL.md': '---\nname: acceptance\nmetadata:\n  version: "0.5.0"\n---\n# Acceptance',
    'LICENSE': 'Apache-2.0',
    'references/report.md': '# Report',
    'surfaces/cli.md': '# CLI',
    'scripts/nested/capture.cjs': 'console.log("capture")',
  };
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(skillDir, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  const bundle = await buildBundle(root, commit, 'v0.5.0');
  const { 'SKILL.md': content, ...resources } = files;
  assert.deepEqual(bundle, {
    content,
    files: resources,
    identifier: 'acceptance',
    name: 'acceptance',
    source: { commit, path: 'skills/acceptance', repository: 'lobehub/acceptance', tag: 'v0.5.0' },
    version: '0.5.0',
  });
  await assert.rejects(buildBundle(root, commit, 'v0.6.0'), /does not match/);
  await symlink(path.join(root, 'outside'), path.join(skillDir, 'linked'));
  await assert.rejects(buildBundle(root, commit), /Only regular files/);
});

test('ships the actual portable capture scripts and their dependencies', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const bundle = await buildBundle(root, commit);
  for (const file of [
    'LICENSE',
    'references/screenshot-helpers.md',
    'scripts/cdp-capture.cjs',
    'scripts/cdp-screenshot.sh',
    'scripts/check-screen-recording.sh',
    'scripts/image-brightness.sh',
    'surfaces/cli.md',
  ]) {
    assert.equal(bundle.files[file], await readFile(path.join(root, 'skills/acceptance', file), 'utf8'));
  }
});
