import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { parseDocument } from 'yaml';

const exec = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

export async function buildBundle(root, commit, tag) {
  const skillDir = path.join(root, 'skills/acceptance');
  const content = await readFile(path.join(skillDir, 'SKILL.md'), 'utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1];
  if (!frontmatter) throw new Error('SKILL.md must have YAML frontmatter');
  const document = parseDocument(frontmatter);
  if (document.errors.length) throw new Error(`Invalid skill metadata: ${document.errors[0].message}`);
  const metadata = document.toJS();
  const version = metadata.metadata?.version;
  if (metadata.name !== 'acceptance' || typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('Expected name: acceptance and metadata.version: "X.Y.Z"');
  }
  if (tag && tag !== `v${version}`) throw new Error(`Tag ${tag} does not match skill version v${version}`);
  if (!/^[a-f\d]{40}$/.test(commit)) throw new Error('Expected a full source commit SHA');

  const files = {};
  async function collect(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await collect(target);
      } else if (entry.isFile()) {
        const relative = path.relative(skillDir, target).split(path.sep).join('/');
        if (relative !== 'SKILL.md') files[relative] = await readFile(target, 'utf8');
      } else {
        throw new Error(`Only regular files and directories may be bundled: ${target}`);
      }
    }
  }
  await collect(skillDir);

  return {
    content,
    files,
    identifier: 'acceptance',
    name: metadata.name,
    source: {
      commit,
      path: 'skills/acceptance',
      repository: 'lobehub/acceptance',
      tag: `v${version}`,
    },
    version,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { stdout } = await exec('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot });
  const bundle = await buildBundle(repositoryRoot, stdout.trim(), process.argv[2]);
  const output = path.join(repositoryRoot, 'dist/acceptance-skill.json');
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`${output}: v${bundle.version}, ${Object.keys(bundle.files).length + 1} files, ${bundle.source.commit}`);
}
