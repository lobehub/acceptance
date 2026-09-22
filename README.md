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

### With a prompt

Open the project you want to verify in your coding agent. Copy this prompt and let it complete the setup:

```text
Read https://app.lobehub.com/acceptance/skill.md and follow the instructions to install Acceptance.
```

Your agent will install the reporting CLI and the Acceptance skill, and guide you through signing in to LobeHub.

### With commands

#### LobeHub CLI (recommended)

Use the `lh` CLI to install the skill and publish reports and evidence to [LobeHub](https://lobehub.com). It requires Node.js 22.15 or later and a LobeHub account.

Install the CLI, then run these commands from the project you want to verify. Follow the browser prompts from `lh login` to sign in before installing the skill:

```bash
npm install -g @lobehub/cli
lh login
lh acceptance install
```

The skill is installed in `.agents/skills/acceptance` from this repository's default branch. Existing files are skipped unless you pass `--force`.

To update to the latest skill source:

```bash
lh acceptance update
```

Updates replace installed skill files, including local edits, and remove stale resources. Use `--dir <path>` with either command to target another project.

#### Skills CLI (alternative)

You can also install the skill with the Skills CLI. Run this command from the project you want to verify:

```bash
npx skills add lobehub/acceptance --skill acceptance
```

To update a skill installed this way:

```bash
npx skills update acceptance
```

This installs only the skill. To publish reports and evidence, install the `lh` CLI and sign in as shown above.

After installation or an update with either method, reload skills or start a new agent session as required by your client.

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

## Development checks

Run the helper regression tests on macOS or Linux with Node.js 22.15 or later,
Bash, and Python 3. No npm dependencies, running browser, display permission,
LobeHub checkout, or account are needed:

```bash
node --test tests/*.test.mjs
```

The tests use a local mock CDP server and simulated macOS tools. They exercise
installed copies from an unrelated working directory, with spaces in paths and
without executable bits, including concurrent captures and preflight failures.

## License

[Apache License 2.0](LICENSE).
