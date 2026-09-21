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

Run this from the project you want to verify; add `--global` to make the skill available across projects. The standard installer reads the repository's default branch:

```bash
npx skills add lobehub/acceptance --skill acceptance
```

The command copies the current source under `skills/acceptance`, including its
references, surfaces, scripts, and license. Changes merged into the default
branch become available on the next install or update; publishing a tag or
GitHub Release is not required. Already-installed files do not change automatically.

The `lh` CLI uses the same default-branch source through its authenticated
server endpoint:

```bash
lh login
lh acceptance install
lh acceptance update
```

`install` preserves existing files unless `--force` is supplied. `update` replaces
the installed files and removes resources absent from the current source.
Both maintain agent links to `.agents/skills/acceptance`. Commit that generated
directory if your project needs a reviewed snapshot; maintain the source here
rather than an installed copy. With an updated CLI, `--json` records the exact
source commit and the version declared in `SKILL.md`. The declared version does
not gate source updates.

The server resolves one commit and downloads all skill files from that commit.
Once this source adapter is deployed, existing CLIs, including `@lobehub/cli`
0.0.55, receive the default-branch source without upgrading. Self-hosted servers
need the adapter update too. Installation and reporting with `lh` require login.

To install an existing tag explicitly, use its source URL:

```bash
npx skills add https://github.com/lobehub/acceptance/tree/v0.5.0/skills/acceptance --skill acceptance
```

An updated CLI and server also support `lh acceptance update --skill-version 0.5.0`
to select that tag. This option is absent in CLI 0.0.55. A later
`lh acceptance update` without the option returns to the current default branch.
Both paths read repository source, without requiring a release asset.

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
