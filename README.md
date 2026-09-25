<div align="center">

![](https://github.com/user-attachments/assets/c38c3213-161f-4739-9b4a-e85254215a7b)

# Acceptance

**See the evidence before you accept AI-built work.**

Your agent says it's done.
Acceptance shows you the screenshots and recordings, on one link your team can review, wherever the agent ran.

[Product][product] · [Skill][skill] · [Surfaces](#where-it-runs) · [Feedback][issues]


Acceptance is open-source acceptance testing for Agents. Your coding agent turns a request into observable checks, runs the real product, and publishes a report with screenshots, recordings, and logs attached to each check. You accept the work, or send individual checks back.

```
Test -> Review-> Verify -> Simplify -> ♻️ = Acceptance
```

</div>

<details>
<summary><kbd>Table of contents</kbd></summary>

#### TOC

- [Why Acceptance](#why-acceptance)
- [What it catches](#what-it-catches)
- [How it works](#how-it-works)
- [Works with your agent](#works-with-your-agent)
- [Where it runs](#where-it-runs)
- [Sharing and storage](#sharing-and-storage)
- [Installation](#installation)
- [Documentation](#documentation)
- [Development](#development)
- [License](#license)

</details>

<br/>

##  “Done” is the agent’s word. “Accepted” is yours.

You rarely know exactly what you want until you see it. Acceptance gives that moment a place: a report you can open from anywhere, review with your team, and that gets sharper every time you send something back.

## Why Acceptance

- **See the work, wherever it ran.** Background runs, cloud sandboxes, a machine with no screen. The agent publishes its screenshots and recordings to one link, so at 9 a.m. you can review what it finished at 2.
- **It remembers what you sent back.** Every round leaves behind criteria, examples of what failed, and what changed. The agent checks them before its next handoff, so the same miss doesn’t come back.
- **Review it together.** Design, product, and engineering open the same report. Mark a region, reply in the thread, and accept the checks you own. Every decision shows who made it.

![](https://github.com/user-attachments/assets/1d5fc50a-a0da-4d18-bb9a-aa3e8f535d76)

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## What it catches

Tests prove the code runs. They don't notice a clipped menu, a label that vanishes in dark mode, or a German button spilling off a 320px screen. Acceptance checks what a person would check, and shows you what it saw.

- **Point at the exact pixel.** Draw a box on the screenshot and say what is wrong. The next round starts from that region, not from “it looks off”.
- **Motion, on the record.** Drags, transitions, and loading states are recorded, so you can scrub to the frame where it jumps.
- **Light and dark, side by side.** Every theme is captured in the same state, so contrast bugs can’t hide in the mode nobody opened.
- **Long words, small screens.** Real locales at real widths. German at 320px is where buttons wrap and labels spill first.
- **Keyboard, not just clicks.** Tab order, focus traps, and Esc are driven key by key, and every step is logged.
- **Send back one check, keep the rest.** Each check keeps its own rounds. Fix what failed, and what you already accepted stays accepted.

![](https://github.com/user-attachments/assets/68e34858-571e-4a5d-b8c8-0871e912ab47)

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## How it works

Three steps from “done” to accepted. You describe the outcome. Your agent turns it into checks, exercises the product, and publishes a report. You review the evidence and decide.

### `01` Say what done looks like

Describe the outcome in plain words. The agent drafts checks you can edit before anything runs.

### `02` Your agent runs the real product

It opens the app, clicks through, resizes, switches themes, and captures every step it takes.

### `03` You make the call

Read what the agent observed next to the proof. Accept it, or send back that one check. Your note becomes a lesson for the next run.

![](https://github.com/user-attachments/assets/0773d927-5638-4d8f-8656-fe0f5ffb1e88)

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## Works with your agent

Any coding agent that can load skills and drive the surface you want to check. Use it with **LobeHub, OpenClaw, Claude Code, Codex, Antigravity, Amp, Gemini CLI, Cursor, OpenCode, Hermes, Pi Agent, Grok Build**, or another harness that supports Agent Skills.

<p>
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/lobehub-color.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/lobehub-color.png" alt="LobeHub" title="LobeHub" width="32" height="32"></picture>&nbsp;&nbsp;
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/openclaw-color.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/openclaw-color.png" alt="OpenClaw" title="OpenClaw" width="32" height="32"></picture>&nbsp;&nbsp;
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/claudecode-color.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/claudecode-color.png" alt="Claude Code" title="Claude Code" width="32" height="32"></picture>&nbsp;&nbsp;
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/codex-color.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/codex-color.png" alt="Codex" title="Codex" width="32" height="32"></picture>&nbsp;&nbsp;
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/antigravity-color.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/antigravity-color.png" alt="Antigravity" title="Antigravity" width="32" height="32"></picture>&nbsp;&nbsp;
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/amp-color.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/amp-color.png" alt="Amp" title="Amp" width="32" height="32"></picture>&nbsp;&nbsp;
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/gemini-color.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/gemini-color.png" alt="Gemini CLI" title="Gemini CLI" width="32" height="32"></picture>&nbsp;&nbsp;
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/cursor.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/cursor.png" alt="Cursor" title="Cursor" width="32" height="32"></picture>&nbsp;&nbsp;
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/opencode.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/opencode.png" alt="OpenCode" title="OpenCode" width="32" height="32"></picture>&nbsp;&nbsp;
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/hermesagent.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/hermesagent.png" alt="Hermes" title="Hermes" width="32" height="32"></picture>&nbsp;&nbsp;
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/pi.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/pi.png" alt="Pi Agent" title="Pi Agent" width="32" height="32"></picture>&nbsp;&nbsp;
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://unpkg.com/@lobehub/icons-static-png@1.97.1/dark/grok.png"><img src="https://unpkg.com/@lobehub/icons-static-png@1.97.1/light/grok.png" alt="Grok Build" title="Grok Build" width="32" height="32"></picture>
</p>

Web checks run in a browser, CLI checks in the terminal, and native checks on the desktop or in the iOS Simulator. LobeHub provides the reporting and review workspace. You keep using your preferred agent.

## Where it runs

The same report, on the surface your product uses. A web flow, a command, a desktop window, or the iOS Simulator. The evidence follows.

| Environment | Coverage |
| --- | --- |
| [Web](skills/acceptance/surfaces/web.md) | Pages, flows, and layouts |
| [CLI](skills/acceptance/surfaces/cli.md) | Commands, APIs, and data |
| [Electron](skills/acceptance/surfaces/electron.md) | Windows, menus, and dialogs |
| [macOS](skills/acceptance/surfaces/native.md) | Menu bar and OS interactions |
| [iOS Simulator](skills/acceptance/surfaces/ios-simulator.md) | Gestures and device layouts |

![](https://github.com/user-attachments/assets/fea4dc89-4d0d-4be0-8c6b-c8f358513dfc)

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## Sharing and storage

Reports and their evidence are published to LobeHub. Each report has its own link.

- **Reviewers only need the link.** They open the report in a browser, with nothing to install, and can comment on checks and screenshots once signed in to LobeHub. Your agent can read everyone's comments with `lh acceptance feedback` and work from them in the next round.
- **Look before you share.** Anyone with the link can open a report from your personal account, while reports published to a workspace are members-only. A setting to limit who can open each report is on the way. The [evidence rules](skills/acceptance/references/evidence.md#artifact-safety) tell your agent to leave out credentials and unrelated windows, but only you know what else is sensitive. Send the link to the people who need it.
- **Evidence uses your LobeHub storage.** Screenshots, recordings, and other evidence files count toward your account's file storage, or your workspace's when you publish there. Every account includes free storage. When you need more, [upgrade your plan][pricing] or delete reports you no longer need along with their evidence.

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## Installation

Install it where the work already lives. Add the skill to the project you want to check, then ask your agent to verify it.

> [!IMPORTANT]
>
> Reload skills or start a new agent session after installation.

Then ask your agent: “Use Acceptance to verify this feature against my requirements.”

### `A` Ask your agent

Paste this into your coding agent, inside the project you want to verify. It will install the CLI and skill, then guide you through signing in.

```text
Read https://lobehub.com/acceptance/skill.md and follow the instructions to install Acceptance.
```

### `B` LobeHub CLI

Requires Node.js 22.15 or later and a LobeHub account. Run these commands in your project and finish the browser sign-in before installing the skill:

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

### `C` Skills CLI

Installs the skill only. Run this from the project you want to verify:

```bash
npx skills add lobehub/acceptance --skill acceptance
```

To update a skill installed this way:

```bash
npx skills update acceptance
```

> [!TIP]
>
> To publish reports and evidence, also install the LobeHub CLI and sign in using the commands in [`B`](#b-lobehub-cli).

### `D` Claude Code plugin

In Claude Code, add this repository's marketplace and install the plugin:

```text
/plugin marketplace add lobehub/acceptance
/plugin install acceptance@acceptance
```

The plugin bundles the same `skills/acceptance` skill and its supporting resources. Invoke it with `/acceptance:acceptance`, or ask Claude to verify a delivery and collect evidence. To publish reports and evidence, install the `lh` CLI and sign in as in [`B`](#b-lobehub-cli). The plugin does not install the CLI.

To update a plugin installed this way, run these commands in Claude Code:

```text
/plugin marketplace update acceptance
/plugin update acceptance@acceptance
```

In Claude Code, run `/reload-plugins` when prompted, or start a new session.

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## Documentation

| [Skill instructions](skills/acceptance/SKILL.md) | How an agent runs a verification round |
| --- | --- |
| [Project setup](skills/acceptance/references/project-adapter.md) | Commands, ports, auth, and surfaces for a repository |
| [Evidence guide](skills/acceptance/references/evidence.md) | What to capture for a check |
| [Report format](skills/acceptance/references/report.md) | How a published round is structured |

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## Development

Run the helper regression tests on macOS or Linux with Node.js 22.15 or later, Bash, and Python 3. No npm dependencies, running browser, display permission, LobeHub checkout, or account are needed:

```bash
node --test tests/*.test.mjs
```

The tests use a local mock CDP server and simulated macOS tools. They exercise installed copies from an unrelated working directory, with spaces in paths and without executable bits, including concurrent captures and preflight failures.

With Claude Code installed, validate both plugin manifests from the repository root:

```bash
claude plugin validate .claude-plugin/plugin.json --strict
claude plugin validate .claude-plugin/marketplace.json --strict
```

To try the plugin locally before publishing:

```bash
claude --plugin-dir .
```

Then invoke `/acceptance:acceptance`. Claude Code discovers the existing `skills/` directory automatically; no separate copy of the skill is needed. See the [Claude Code plugin documentation](https://code.claude.com/docs/en/plugins) for the plugin layout and local development workflow.

When releasing skill updates, keep the version in `.claude-plugin/plugin.json` in sync with `metadata.version` in `skills/acceptance/SKILL.md`. Bump the plugin version for every plugin release so installed users receive updates; the marketplace entry uses the version from `plugin.json`.

<div align="right">

[![][back-to-top]](#readme-top)

</div>

---

<details>
<summary><h4 id="license">📝 License</h4></summary>

[![][license-shield]][license]

</details>

Copyright © 2026 [LobeHub][profile]. <br />
This project is [Apache License 2.0](./LICENSE) licensed.

[issues]: https://github.com/lobehub/acceptance/issues
[license]: ./LICENSE
[license-shield]: https://img.shields.io/badge/license-Apache%202.0-white?labelColor=black&style=flat-square
[pricing]: https://lobehub.com/pricing
[product]: https://lobehub.com/acceptance
[profile]: https://github.com/lobehub
[skill]: https://lobehub.com/acceptance/skill.md
[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square
