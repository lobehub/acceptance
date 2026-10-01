# Resource guard — bound a run's memory cost

A long acceptance run boots services, drives a browser, and records media. Left
unbounded, its memory use grows until the host swaps itself to a crawl and the
machine — and the client driving the run — freezes. The guard samples the host,
classifies a tier, and at **red** stops only the processes this run started.

## What actually grows

| Source | Why it grows |
| --- | --- |
| `agent-browser` sessions | Each named session is a detached daemon plus a headless browser. An unclosed one never exits: hundreds of MB to over 1 GB each, one more per run. |
| One long-lived session | Renderer heap, page cache, full-page screenshots, HAR buffers and CDP frame captures accumulate as long as the session stays open. |
| Dev servers and type-check workers | A dev server and a type checker per run; concurrent runs multiply them. |
| Recordings | Frame sequences held in memory until they are assembled and written. |

**Swap exhaustion, not total RAM, is what freezes the host.** When a machine that
was fine becomes unusable mid-run, measure `sysctl vm.swapusage` (macOS) or
`/proc/meminfo` (Linux) before blaming the browser.

## Run it

Start one guard per run, before the first heavy command, and stop it at teardown:

```bash
GUARD=.agents/skills/acceptance/scripts/resource-guard.sh
RUN_DIR=".acceptances/guard/$RUN_TAG"

bash "$GUARD" start \
  --state-dir "$RUN_DIR" --run-tag "$RUN_TAG" --interval 10 \
  --group browser='Google Chrome for Testing|agent-browser' \
  --group devserver='next-server|vite' \
  --yellow 'swap=70,free=25' \
  --red 'swap=85,free=10,group.browser.rss=1500' \
  --on-red stop-owned

bash "$GUARD" check  --json   # one verdict now; exit 0 green, 10 yellow, 20 red
bash "$GUARD" status --json   # samples, red/yellow counts, recorded events
bash "$GUARD" stop            # at teardown, always
```

Threshold spec: comma-separated `KEY=VALUE`, any subset of
`swap=PCT`, `free=PCT`, `total.rss=MB`, `group.NAME.rss=MB`, `group.NAME.count=N`.
`--group NAME=PATTERN` is repeatable; the pattern is an ERE matched against each
process command line. Keep patterns specific to the processes this run starts.

## Ownership — what `stop-owned` may stop

A process belongs to this run when it is **absent from the group's pre-start
snapshot**, or its command line contains `--run-tag`. `stop-owned` signals only
those, only in the declared groups, `TERM` first and then `KILL` after `--grace`.

It never issues a process-name kill, and never touches a process that predates
the guard — a sibling run's browser and a dev server the user started keep
running. Anything wider (`close --all`, `pkill`) kills other agents' work
mid-capture.

## Reacting to a tier

| Tier | What to do |
| --- | --- |
| green | Continue. |
| yellow | Recycle before it becomes red: close idle browser sessions, drop the oldest recording frames, re-check. |
| red | The guard stops this run's owned heavy processes. Keep the evidence already in hand, mark the remaining checks `blocked` with the reason, and publish. |

A red tier is a real observation, not a failure to hide: a check the run never
exercised is `blocked`, never `passed`.

## Bound it by construction

The guard is the backstop, not the only defense:

- **Idle timeout.** Export `AGENT_BROWSER_IDLE_TIMEOUT_MS` before the first
  `agent-browser` call so an abandoned session shuts itself down.
- **Recycle long sessions.** Close and reopen a session (with `--restore` to keep
  auth) after a run of heavy captures instead of holding one browser open for the
  whole round.
- **Write media to disk.** Let screenshots, HAR files and frames land in files;
  do not hold them in memory.
- **One dev server per repository.** Reuse a running one instead of starting a
  second, and stop only what this run started.
