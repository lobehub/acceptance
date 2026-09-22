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

#### Skill

Run the command from the project you want to verify; add `--global` to make the skill available across projects.

```bash
npx skills add lobehub/acceptance --skill acceptance
```

To update an installed skill:

```bash
npx skills update acceptance
```

After installation or an update, reload skills or start a new agent session as required by your client.

#### Reporting CLI

Reports and evidence are published to [LobeHub](https://lobehub.com) through the `lh` CLI. Publishing requires a LobeHub account; the CLI requires Node.js 22.15 or later.

Install the CLI and sign in:

```bash
npm install -g @lobehub/cli
lh login
```

Follow the browser prompts to sign in to your LobeHub account.

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
