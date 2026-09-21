# Acceptance

**Give people evidence to review AI-built work.**

Acceptance is an **Agent Skill** that helps coding agents verify features and fixes against your requirements, collect evidence from the product, and publish results for review.

Use it in your existing project alongside tests and code reviews. Your agent performs the verification; you decide whether the delivery meets your requirements.

## What it does

- **Defines acceptance criteria:** turns requirements into observable outcomes.
- **Verifies product behavior:** exercises the relevant interfaces and user journeys.
- **Collects evidence:** captures screenshots, recordings, audio, command output, and structured data.
- **Publishes reviewable results:** brings together each check, its observations, and supporting evidence.
- **Tracks follow-up verification:** keeps feedback and later rounds on the same acceptance page.

## Installation

### Skill

Stable releases include `acceptance-skill.json`: the complete `SKILL.md`, references,
surfaces, scripts, and license, with the skill version and exact source commit.
The latest non-prerelease GitHub release is the default installation source.

Run these commands from the project you want to verify. The `lh` CLI requires
a LobeHub account for installation and reporting:

```bash
lh login
lh acceptance install
lh acceptance update

# Pin a version, or restore it after an update:
lh acceptance update --skill-version 0.5.0
```

`install` preserves existing files unless `--force` is supplied. `update` replaces
the installed files and removes resources absent from the selected release.
Both maintain agent links to `.agents/skills/acceptance`. Commit that generated
directory if your project needs a reviewed, reproducible skill snapshot; edit the
source here rather than an installed copy.

All CLI versions, including `@lobehub/cli` 0.0.55, fetch through the authenticated
`verify.getSkillBundle` endpoint. Once the server's release adapter is deployed,
existing clients receive the latest stable bundle without upgrading. Selecting
a version with `--skill-version` requires both the updated CLI and server; this
flag is not available in CLI 0.0.55. Self-hosted servers need the adapter update
too.

A general skill installer also works. Pin the tag to use the same source version:

```bash
npx skills add https://github.com/lobehub/acceptance/tree/v0.5.0/skills/acceptance --skill acceptance
```

An unpinned `npx skills add lobehub/acceptance --skill acceptance` follows the
default branch, which may be newer than the stable release. Choose one installer
for a directory: mixing branch-based updates and release-based `lh` updates can
replace a newer development snapshot with the stable release.

After installation or an update, reload skills or start a new agent session as required by your client.

### Reporting CLI

Reports and evidence are published to [LobeHub](https://lobehub.com) through the `lh` CLI. Publishing requires a LobeHub account; the CLI requires Node.js 22.15 or later.

Install the CLI and sign in:

```bash
npm install -g @lobehub/cli
lh login
```

Follow the browser prompts to sign in to your LobeHub account.

Skill versions and CLI versions are independent. Skill `0.5.0` does not imply
CLI `0.5.0`. `lh acceptance create` is not available in CLI `0.0.55`; flow-first
planning requires a CLI release containing that command (check
`lh acceptance --help`). Its release is tracked separately in
[LOBE-14280](https://linear.app/lobehub/issue/LOBE-14280).
Creating acceptances and publishing reports always require authentication,
regardless of how the skill was installed.

## Publishing a skill version

1. Update `skills/acceptance/SKILL.md` → `metadata.version` using `X.Y.Z`.
2. Run `pnpm install`, `pnpm test`, and `pnpm bundle vX.Y.Z`.
3. Commit the source changes, then create and push the matching `vX.Y.Z` tag.
4. The release workflow validates the version and publishes
   `dist/acceptance-skill.json` as a GitHub release asset.

The bundle records the tagged commit in `source.commit`; the tag must match
`metadata.version`. Publish a new version for changes rather than moving a tag
or replacing a published asset. Commits to the default branch do not update
`lh` installations until a stable release is published. The JSON keeps the
legacy `identifier`, `name`, `version`, `content`, and `files` fields, so old
clients and newer installers use the same artifact.

## Supported environments

| Environment                                                  | Coverage                                      |
| ------------------------------------------------------------ | --------------------------------------------- |
| [CLI](skills/acceptance/surfaces/cli.md)                     | Command-line tools, APIs, and data processing |
| [Web](skills/acceptance/surfaces/web.md)                     | Browser interfaces and user journeys          |
| [Electron](skills/acceptance/surfaces/electron.md)           | Desktop application behavior                  |
| [Native macOS](skills/acceptance/surfaces/native.md)         | Native apps and OS interactions               |
| [iOS Simulator](skills/acceptance/surfaces/ios-simulator.md) | iOS apps, gestures, and device layouts        |

## Documentation

- [Skill instructions](skills/acceptance/SKILL.md)
- [Project setup](skills/acceptance/references/project-adapter.md)
- [Evidence guide](skills/acceptance/references/evidence.md)
- [Report format](skills/acceptance/references/report.md)

## License

[Apache License 2.0](LICENSE).
