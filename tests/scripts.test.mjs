import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

const cleanups = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

// Materialize an install outside the repository, without node_modules or
// executable bits, as `lh acceptance install` does. Paths contain spaces.
function project() {
  const root = mkdtempSync(path.join(tmpdir(), 'acceptance portable '));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, '.agents/skills/acceptance/scripts');
  mkdirSync(scripts, { recursive: true });
  const source = new URL('../skills/acceptance/scripts/', import.meta.url);
  for (const name of readdirSync(source)) {
    writeFileSync(path.join(scripts, name), readFileSync(new URL(name, source)), { mode: 0o644 });
  }
  mkdirSync(path.join(root, 'tmp'));
  return { root, scripts };
}

function run(file, args, env = {}) {
  return new Promise((resolve) => {
    execFile(
      file.endsWith('.cjs') ? process.execPath : '/bin/bash',
      [file, ...args],
      {
        cwd: tmpdir(),
        env: { ...process.env, NODE_PATH: '', ...env },
        timeout: 5000,
      },
      (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }),
    );
  });
}

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVQIHWP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
);
const otherPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

// Minimal local CDP fixture using only Node built-ins; no ws dependency even in
// tests. It reads masked client frames and sends short unmasked JSON responses.
async function cdp(mode = 'capture', image = png) {
  const calls = [];
  const sockets = new Set();
  const server = createServer((request, response) => {
    if (mode === 'discovery-hang') return;
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify([
        {
          type: 'service_worker',
          url: 'https://wanted.test/worker',
          webSocketDebuggerUrl: `ws://127.0.0.1:${port}/worker`,
        },
        {
          type: 'page',
          url: 'https://unrelated.test',
          webSocketDebuggerUrl: `ws://127.0.0.1:${port}/wrong`,
        },
        {
          type: 'page',
          url: 'https://wanted.test/view',
          webSocketDebuggerUrl: `ws://127.0.0.1:${port}/wanted`,
        },
      ]),
    );
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.on('upgrade', (request, socket) => {
    if (mode === 'handshake-hang') return;
    const accept = createHash('sha1')
      .update(request.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    let buffered = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffered = Buffer.concat([buffered, chunk]);
      while (buffered.length >= 6) {
        const opcode = buffered[0] & 15;
        let length = buffered[1] & 127;
        let offset = 2;
        if (length === 126) {
          if (buffered.length < 8) return;
          length = buffered.readUInt16BE(2);
          offset = 4;
        }
        if (buffered.length < offset + 4 + length) return;
        const mask = buffered.subarray(offset, offset + 4);
        const body = Buffer.from(buffered.subarray(offset + 4, offset + 4 + length));
        buffered = buffered.subarray(offset + 4 + length);
        if (opcode === 8) {
          socket.end();
          return;
        }
        for (let i = 0; i < body.length; i++) body[i] ^= mask[i % 4];
        const message = JSON.parse(body.toString());
        calls.push({ ...message, target: request.url });
        if (mode === 'capture-hang') continue;
        if (mode === 'closed') {
          socket.destroy();
          return;
        }
        const result =
          message.method === 'Page.getLayoutMetrics'
            ? {
                cssContentSize: { width: 800.25, height: 1800.5 },
                contentSize: { width: 1600, height: 3600 },
              }
            : { data: (mode === 'invalid-png' ? Buffer.from('invalid') : image).toString('base64') };
        const payload = Buffer.from(JSON.stringify({ id: message.id, result }));
        const header =
          payload.length < 126
            ? Buffer.from([129, payload.length])
            : Buffer.from([129, 126, payload.length >> 8, payload.length & 255]);
        socket.write(Buffer.concat([header, payload]));
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  cleanups.push(() => {
    for (const socket of sockets) socket.destroy();
    return new Promise((resolve) => server.close(resolve));
  });
  return { port: String(port), calls };
}

function toolPath(
  root,
  {
    platform = 'Darwin',
    permission = 'granted',
    brightness = 255,
    missing = [],
    brokenImage = false,
    unsupportedMasks = false,
    rgba = false,
    swift = false,
  } = {},
) {
  const bin = path.join(root, 'bin');
  mkdirSync(bin);
  const commands = ['dirname', 'mktemp', 'rm', 'cat', 'cp'];
  for (const command of commands)
    symlinkSync(
      execFileSync('/usr/bin/which', [command], { encoding: 'utf8' }).trim(),
      path.join(bin, command),
    );
  if (!missing.includes('node')) symlinkSync(process.execPath, path.join(bin, 'node'));
  if (!missing.includes('python3'))
    symlinkSync(
      execFileSync('/usr/bin/which', ['python3'], { encoding: 'utf8' }).trim(),
      path.join(bin, 'python3'),
    );
  const script = (name, body) =>
    writeFileSync(path.join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  script('uname', `echo '${platform}'`);
  script('ps', 'exit 1');
  if (!missing.includes('clang'))
    script(
      'clang',
      `while [ "$1" != '-o' ]; do shift; done\nshift\nprintf '#!/bin/sh\\necho ${permission}\\n' > "$1"\n/bin/chmod +x "$1"`,
    );
  if (swift) script('swift', `cat >/dev/null\necho '${permission}'`);
  // Simulates sips output without depending on the host display or permission.
  const offset = rgba ? 138 : 54;
  const bmp = Buffer.alloc(offset + 16 * 16 * (rgba ? 4 : 3));
  bmp.write('BM');
  bmp.writeUInt32LE(offset, 10);
  bmp.writeInt32LE(16, 18);
  bmp.writeInt32LE(16, 22);
  bmp.writeUInt16LE(rgba ? 32 : 24, 28);
  // One bright RGB channel, away from the first pixel: detect max vs average
  // and full-grid vs first-pixel mistakes. Opaque alpha must not count.
  bmp[offset + (9 * 16 + 7) * (rgba ? 4 : 3) + 1] = brightness;
  if (rgba) {
    bmp.writeUInt32LE(3, 30);
    Buffer.from('0000ff0000ff0000ff000000000000ff', 'hex').copy(bmp, 54);
    for (let i = offset + 3; i < bmp.length; i += 4) bmp[i] = 255;
    if (unsupportedMasks) bmp.writeUInt32LE(0xff, 54);
  }
  writeFileSync(path.join(root, 'frame.bmp'), brokenImage ? Buffer.from('broken') : bmp);
  writeFileSync(path.join(root, 'frame.png'), png);
  if (!missing.includes('sips'))
    script('sips', 'for output do :; done\ncp "$FIXTURE_ROOT/frame.bmp" "$output"');
  if (!missing.includes('screencapture'))
    script('screencapture', 'for output do :; done\ncp "$FIXTURE_ROOT/frame.png" "$output"');
  return { PATH: bin, FIXTURE_ROOT: root, TMPDIR: path.join(root, 'tmp'), TERM_PROGRAM: 'Test "Terminal"' };
}

test('captures the specified target, including full-page bounds, outside any repository', async () => {
  const { root, scripts } = project();
  const { port, calls } = await cdp();
  const out = path.join(root, 'proof with spaces/page.png');
  const result = await run(
    path.join(scripts, 'cdp-screenshot.sh'),
    ['--port', port, '--target-url', 'wanted.test', '--full', '--out', out],
    toolPath(root, { missing: ['sips'] }),
  );
  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.deepEqual(readFileSync(out), png);
  assert.equal(JSON.parse(result.stdout.split('\n')[0]).targetUrl, 'https://wanted.test/view');
  assert.equal(calls[1].target, '/wanted');
  assert.deepEqual(calls[1].params, {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: 801, height: 1801, scale: 1 },
  });
  assert.match(result.stderr, /brightness was not checked/);
});

for (const helper of ['cdp-screenshot.sh', 'cdp-capture.cjs']) {
  test(`${helper} keeps concurrent implicit outputs distinct across and within ports`, async () => {
    const { root, scripts } = project();
    const first = await cdp();
    const second = await cdp('capture', otherPng);
    const env = toolPath(root, { missing: ['sips'] });
    const results = await Promise.all(
      [first, second, first].map(({ port }) => run(path.join(scripts, helper), ['--port', port], env)),
    );
    const outputs = results.map((result) => {
      assert.equal(result.code, 0, result.stdout + result.stderr);
      const output = JSON.parse(result.stdout.split('\n')[0]);
      assert.equal(output.targetUrl, 'https://unrelated.test');
      assert.equal(output.ok, true);
      return output.out;
    });
    assert.equal(new Set(outputs).size, 3, 'each invocation needs its own output path');
    for (const [index, out] of outputs.entries()) {
      assert.deepEqual(readFileSync(out), index === 1 ? otherPng : png);
      assert.ok(out.startsWith(env.TMPDIR + path.sep));
    }
  });
}

for (const mode of ['discovery-hang', 'handshake-hang', 'capture-hang', 'closed', 'invalid-png']) {
  test(`fails promptly when CDP is ${mode}`, async () => {
    const { root, scripts } = project();
    const { port } = await cdp(mode);
    const out = path.join(root, 'shot.png');
    const result = await run(path.join(scripts, 'cdp-screenshot.sh'), [
      '--port', port, '--timeout', '500', '--out', out,
    ]);
    assert.equal(result.code, 5, result.stdout + result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, false);
    const expected = mode.endsWith('-hang')
      ? /timeout/i
      : mode === 'closed' ? /WebSocket (closed|connection failed)/ : /invalid PNG/;
    assert.match(output.error, expected);
    assert.equal(existsSync(out), false);
  });
}

test('a failed implicit capture leaves no temporary directory behind', async () => {
  const { root, scripts } = project();
  const { port } = await cdp('invalid-png');
  const env = toolPath(root, { missing: ['sips'] });
  const result = await run(path.join(scripts, 'cdp-screenshot.sh'), ['--port', port], env);
  assert.equal(result.code, 5, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).ok, false);
  assert.deepEqual(readdirSync(env.TMPDIR), []);
});

test('fails rather than capturing a different page when the target is absent', async () => {
  const { root, scripts } = project();
  const { port, calls } = await cdp();
  const out = path.join(root, 'shot.png');
  const result = await run(path.join(scripts, 'cdp-capture.cjs'), [
    '--port', port, '--target-url', 'absent.test', '--out', out,
  ]);
  assert.equal(result.code, 5, result.stdout + result.stderr);
  assert.match(JSON.parse(result.stdout).error, /No page target found matching "absent.test"/);
  assert.deepEqual(calls, []);
  assert.equal(existsSync(out), false);
});

for (const explicit of [false, true]) {
  for (const [scenario, options, code] of [
    ['unavailable brightness', { missing: ['sips'] }, 2],
    ['black boundary', { brightness: 11 }, 6],
    ['live boundary', { brightness: 12 }, 0],
    ['capture failure', {}, 5],
  ]) {
    test(`CDP preflight: ${scenario}, ${explicit ? 'retained explicit' : 'disposable implicit'} output`, async () => {
      const { root, scripts } = project();
      const { port } = await cdp(code === 5 ? 'invalid-png' : 'capture');
      const out = path.join(root, 'kept.png');
      if (explicit) writeFileSync(out, otherPng);
      const env = toolPath(root, options);
      const result = await run(
        path.join(scripts, 'cdp-screenshot.sh'),
        ['--port', port, '--check', ...(explicit ? ['--out', out] : [])],
        env,
      );
      assert.equal(result.code, code, result.stdout + result.stderr);
      if (code === 0) assert.match(result.stdout, /PREFLIGHT PASS/);
      else assert.doesNotMatch(result.stdout, /PREFLIGHT PASS/);
      if (explicit) assert.deepEqual(readFileSync(out), code === 5 ? otherPng : png);
      else if (code !== 5) assert.equal(existsSync(JSON.parse(result.stdout.split('\n')[0]).out), false);
      assert.deepEqual(readdirSync(env.TMPDIR), [], 'preflight must clean up its temporary files');
    });
  }
}

test('reports missing Node without trying repository dependencies', async () => {
  const { root, scripts } = project();
  const result = await run(
    path.join(scripts, 'cdp-screenshot.sh'),
    [],
    toolPath(root, { missing: ['node'] }),
  );
  assert.equal(result.code, 7);
  assert.match(result.stderr, /Node.js >=22.15/);
});

for (const [scenario, options, code, permission, capture] of [
  ['live capture', {}, 0, 'granted', 'live'],
  ['black boundary', { brightness: 11 }, 4, 'granted', 'black'],
  ['live boundary', { brightness: 12 }, 0, 'granted', 'live'],
  ['32-bit sips capture', { rgba: true }, 0, 'granted', 'live'],
  ['32-bit black capture with opaque alpha', { rgba: true, brightness: 0 }, 4, 'granted', 'black'],
  ['unsupported BMP masks', { rgba: true, unsupportedMasks: true }, 2, 'granted', 'unknown'],
  ['denied permission', { permission: 'denied' }, 3, 'denied', 'unknown'],
  ['missing permission toolchain', { missing: ['clang'] }, 2, 'unknown', 'unknown'],
  ['Swift permission fallback', { missing: ['clang'], swift: true }, 0, 'granted', 'live'],
  ['missing screenshot tool', { missing: ['screencapture'] }, 2, 'granted', 'unknown'],
  ['missing brightness tool', { missing: ['sips'] }, 2, 'granted', 'unknown'],
  ['broken conversion', { brokenImage: true }, 2, 'granted', 'unknown'],
  ['missing Python', { missing: ['python3'] }, 2, 'unknown', 'unknown'],
  ['non-macOS', { platform: 'Linux' }, 2, 'n/a', 'n/a'],
]) {
  test(`OS preflight reports ${scenario} honestly`, async () => {
    const { root, scripts } = project();
    const env = toolPath(root, options);
    const result = await run(
      path.join(scripts, 'check-screen-recording.sh'),
      ['--json'],
      env,
    );
    assert.equal(result.code, code, result.stdout + result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.ok, code === 0);
    assert.equal(output.permission, permission);
    assert.equal(output.capture, capture);
    if (output.responsibleApp) assert.equal(output.responsibleApp, 'Test "Terminal"');
    assert.deepEqual(readdirSync(env.TMPDIR), []);
  });
}
