# asb — Azure Service Bus CLI

A Node.js CLI for exploring and manipulating Azure Service Bus namespaces. Wraps the official `@azure/service-bus` SDK with a Docker-style noun-verb interface (`asb <noun> <verb> [args]`).

## Installation

```bash
git clone https://github.com/another-guy/asb.git
# cd into the project directory
pnpm install
pnpm build
pnpm link --global
asb --version
```

> **Prerequisites:** Node.js 20+ and [pnpm](https://pnpm.io/installation).

## Authentication

Contexts are named auth profiles stored in `~/.asb/config`. Two auth methods are supported:

- **Connection string:** `asb context add prod --connection-string "Endpoint=sb://..."`
- **FQDN + DefaultAzureCredential:** `asb context add prod --namespace mynamespace.servicebus.windows.net`

Switch between contexts with `asb context use <name>`.

## Quick start

```bash
# Add a context
asb context add local --connection-string "Endpoint=sb://..."
asb context use local

# Explore the namespace
asb tree --depth 2 --stats
asb queue list --stats
asb topic list

# Peek at messages
asb message peek my-queue --count 10
asb message peek my-topic/my-sub --dlq

# Find messages matching a predicate
asb message find my-queue --filter 'msg.body.type === "error"' --limit 20
```

## Feature roadmap

### Environment scaffolding

| #   | Feature                        | Status     |
| --- | ------------------------------ | ---------- |
| S1  | Node.js version pin (`.nvmrc`) |            |
| S2  | pnpm project init              | ✅ complete |
| S3  | TypeScript setup               | ✅ complete |
| S4  | `tsx` dev runner               | ✅ complete |
| S5  | CommanderJS install            | ✅ complete |
| S6  | picocolors install             | ✅ complete |
| S7  | Vitest setup                   | ✅ complete |
| S8  | Build & bin wiring             | ✅ complete |

### CLI features

| #     | Command                                                | Description                                                                                   | Status     |
| ----- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------- |
| F01.1 | `asb context add`                                      | Save a named auth profile (connection string or FQDN)                                         | ✅ complete |
| F01.2 | `asb context list`                                     | Print all saved contexts, marking the active one                                              | ✅ complete |
| F01.3 | `asb context use`                                      | Set the active context                                                                        | ✅ complete |
| F01.4 | `asb context get`                                      | Print full details of a context                                                               | ✅ complete |
| F01.5 | `asb context delete`                                   | Remove a named context                                                                        | ✅ complete |
| F02   | `asb namespace info`                                   | Verify connection; view namespace SKU and timestamps                                          | ✅ complete |
| F03   | `asb queue list [--stats]`                             | Enumerate queues with optional live message counts                                            | ✅ complete |
| F04   | `asb topic list [--stats]`                             | Enumerate topics with optional subscription count                                             | ✅ complete |
| F05   | `asb subscription list <topic> [--stats]`              | Enumerate subscriptions with optional message counts                                          | ✅ complete |
| F06   | `asb queue get / stats <name>`                         | Queue configuration and runtime metrics                                                       | ✅ complete |
| F07   | `asb topic get / stats <name>`                         | Topic configuration and runtime metrics                                                       | ✅ complete |
| F08   | `asb subscription get / stats <topic> <name>`          | Subscription configuration and runtime metrics                                                | ✅ complete |
| F09   | `asb rule list / get <topic> <sub>`                    | Explore filter rules on a subscription                                                        | ✅ complete |
| F09.5 | `asb tree [<target>] [--depth <n>] [--stats]`          | Render entity hierarchy as a tree with optional live counts                                   | ✅ complete |
| F10   | `asb message peek <queue>`                             | Non-destructive message inspection on a queue                                                 | ✅ complete |
| F11   | `asb message peek <topic>/<sub>`                       | Non-destructive inspection of subscription messages                                           | ✅ complete |
| F12   | `asb message peek <target> --dlq`                      | Inspect dead-letter sub-queue contents                                                        | ✅ complete |
| F13   | `asb message send <target>`                            | Send messages to a queue or topic (flag, file, or stdin)                                      | ✅ complete |
| F13.5 | `asb message find <target> [--filter <js-expr>]`       | Scan for messages matching a JS predicate; `--limit` caps output, `--max-scan` caps work done | ✅ complete |
| F14   | `asb message receive <target> [--mode] [--then]`       | Receive with configurable settlement (complete, abandon, deadletter, defer)                   |            |
| F15   | `asb message receive <target> --drain`                 | Loop until entity is empty (bulk-clear)                                                       |            |
| F16   | `asb message receive <target> --dlq`                   | Receive and settle dead-letter messages                                                       |            |
| F17   | `asb message schedule <target> --at <iso8601>`         | Schedule future message delivery                                                              |            |
| F18   | `asb message cancel-scheduled <target> --sequence <N>` | Cancel a pending scheduled message                                                            |            |
| F19   | `asb session state get/set <target> <session-id>`      | Read and write session state on session-aware entities                                        |            |
| F20   | `asb queue create <name>`                              | Create a queue with full property configuration                                               |            |
| F21   | `asb queue update <name>`                              | Update mutable queue properties                                                               |            |
| F22   | `asb queue delete <name>`                              | Permanently delete a queue                                                                    |            |
| F23   | `asb topic create <name>`                              | Create a topic                                                                                |            |
| F24   | `asb topic update <name>`                              | Update mutable topic properties                                                               |            |
| F25   | `asb topic delete <name>`                              | Delete a topic and all its subscriptions                                                      |            |
| F26   | `asb subscription create <topic> <name>`               | Create a subscription with optional default rule                                              |            |
| F27   | `asb subscription update <topic> <name>`               | Update mutable subscription properties                                                        |            |
| F28   | `asb subscription delete <topic> <name>`               | Permanently delete a subscription                                                             |            |
| F29   | `asb rule create <topic> <sub> <name>`                 | Add a filter rule (SQL or correlation) with optional action                                   |            |
| F30   | `asb rule update <topic> <sub> <name>`                 | Replace filter or action on an existing rule                                                  |            |
| F31   | `asb rule delete <topic> <sub> <name>`                 | Remove a filter rule                                                                          |            |

## Development

```bash
pnpm dev -- --help   # run via tsx without a build step
pnpm build           # compile TypeScript → dist/
pnpm test            # run Vitest test suite
```
