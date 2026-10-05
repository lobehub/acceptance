import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = ".claude-plugin/plugin.json";
const distributedPaths = ["skills/acceptance", manifestPath];
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const manifest = JSON.parse(read(manifestPath));
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const hasRef = (ref) =>
  spawnSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
    cwd: root,
    stdio: "ignore",
  }).status === 0;
const changedFiles = (ref) =>
  git("diff", "--name-only", ref, "--", ...distributedPaths);
const compareVersions = (left, right) => {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  }
  return 0;
};

test("skill and plugin declare the same stable release version", () => {
  assert.match(manifest.version, stableVersion);
  const frontmatter = read("skills/acceptance/SKILL.md").match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
  )?.[1];
  assert.ok(frontmatter, "SKILL.md must have YAML frontmatter");
  const metadata = frontmatter.match(
    /^metadata:[ \t]*\r?\n((?:[ \t]+[^\r\n]*(?:\r?\n|$))*)/m,
  )?.[1];
  const version = metadata?.match(
    /^  version: (["']?)(\d+\.\d+\.\d+)\1[ \t]*$/m,
  )?.[2];
  assert.equal(
    version,
    manifest.version,
    "Keep both version declarations in sync",
  );
});

test("marketplace delegates versioning to the plugin manifest", () => {
  const marketplace = JSON.parse(read(".claude-plugin/marketplace.json"));
  const plugin = marketplace.plugins.find(({ name }) => name === manifest.name);
  assert.ok(plugin, "The marketplace must include the acceptance plugin");
  assert.equal(
    plugin.version,
    undefined,
    "Declare the plugin version only in plugin.json",
  );
});

test("release tag matches the declared version", (t) => {
  if (process.env.GITHUB_REF_TYPE !== "tag") return t.skip("Not a tag build");
  assert.equal(process.env.GITHUB_REF_NAME, `v${manifest.version}`);
});

test("published versions keep their distributed files unchanged", (t) => {
  const tag = `refs/tags/v${manifest.version}`;
  if (!hasRef(tag)) return t.skip("No local tag for this version");
  const changed = changedFiles(tag);
  assert.equal(
    changed,
    "",
    `Distributed files differ from ${tag}; release them under a new version:\n${changed}`,
  );
});

// Default-branch installs (`npx skills add` and `lh acceptance update`) consume
// main without waiting for a release tag. A content change without a version bump
// would give main and tagged/cached installs different content under the same
// version, so distributed changes must bump both versions before merging.
test("distributed changes increase the version from the base commit", (t) => {
  const base = process.env.SKILL_VERSION_BASE;
  if (process.env.GITHUB_REF_TYPE === "tag" || !base || /^0+$/.test(base)) {
    return t.skip("No branch or pull-request base to compare");
  }
  assert.ok(hasRef(base), "Fetch the base commit before checking its version");
  const previous = JSON.parse(git("show", `${base}:${manifestPath}`));
  assert.match(previous.version, stableVersion);
  assert.match(manifest.version, stableVersion);
  const comparison = compareVersions(manifest.version, previous.version);
  assert.ok(comparison >= 0, "Release versions must not decrease");
  const changed = changedFiles(base);
  if (changed) {
    assert.ok(
      comparison > 0,
      `Bump both skill and plugin versions above ${previous.version} for these changes:\n${changed}`,
    );
  }
});
