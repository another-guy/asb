# ASB CLI — Execution Plan

## Environment Scaffolding

One-time tasks to stand up the working environment before any feature work begins. Must be completed in order.

| #   | Name                | Description                                                                                                                            | Status   |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| S1  | Node.js version pin | Create `.nvmrc` with the target LTS version; verify `fnm` activates it                                                                 |          |
| S2  | pnpm project init   | `pnpm init`; set `"type": "module"`, `"name": "asb"` in `package.json`                                                                 | complete |
| S3  | TypeScript setup    | Install `typescript` as dev dependency; create `tsconfig.json` (strict, ESNext target, NodeNext module resolution)                     | complete |
| S4  | tsx dev runner      | Install `tsx`; add `"dev": "tsx src/index.ts"` script                                                                                  | complete |
| S5  | CommanderJS install | `pnpm add commander`; create stub entry point at `src/index.ts` that registers the root command                                        | complete |
| S6  | picocolors install  | `pnpm add picocolors`; no wiring needed yet — available for feature use                                                                | complete |
| S7  | Vitest setup        | `pnpm add -D vitest`; add `"test": "vitest"` script; add a smoke test confirming the entry point loads                                 |          |
| S8  | Build & bin wiring  | Add `"build": "tsc"` script; set `"bin": { "asb": "./dist/index.js" }` in `package.json`; verify `pnpm build` produces `dist/index.js` |          |

---

## CLI Features

Features are ordered from highest to lowest priority. The first block covers setup and exploration (non-destructive, no Azure management permissions required). Administrative features follow.

| #   | Name                        | Description                                                                                                                            | Status |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Context management          | `asb context add / list / use / get / delete` — store and switch named auth profiles in `~/.asb/config`                                |        |
| 2   | Namespace info              | `asb namespace info` — verify connection and view namespace SKU, messaging units, timestamps                                           |        |
| 3   | Queue list                  | `asb queue list [--stats]` — enumerate all queues; `--stats` adds live message counts                                                  |        |
| 4   | Topic list                  | `asb topic list [--stats]` — enumerate all topics with optional subscription count and size                                            |        |
| 5   | Subscription list           | `asb subscription list <topic> [--stats]` — enumerate subscriptions for a topic with optional message counts                           |        |
| 6   | Queue inspect               | `asb queue get <name>` (configuration) and `asb queue stats <name>` (runtime metrics)                                                  |        |
| 7   | Topic inspect               | `asb topic get <name>` and `asb topic stats <name>`                                                                                    |        |
| 8   | Subscription inspect        | `asb subscription get <topic> <name>` and `asb subscription stats <topic> <name>`                                                      |        |
| 9   | Rule list & get             | `asb rule list <topic> <sub>` and `asb rule get <topic> <sub> <name>` — explore filter rules on a subscription                         |        |
| 10  | Message peek — queue        | `asb message peek <queue> [--count] [--from-sequence]` — non-destructive message inspection on a queue                                 |        |
| 11  | Message peek — subscription | `asb message peek <topic>/<sub> [--count]` — non-destructive inspection of subscription messages                                       |        |
| 12  | Message peek — DLQ          | `asb message peek <target> --dlq [--count]` — inspect dead-letter sub-queue contents without acquiring a lock                          |        |
| 13  | Message send                | `asb message send <target>` — send one or more messages to a queue or topic, body from flag, file, or stdin                            |        |
| 14  | Message receive             | `asb message receive <target> [--mode] [--then]` — receive with configurable settlement: complete, abandon, deadletter, defer, or none |        |
| 15  | Message drain / purge       | `asb message receive <target> --drain --then complete` — loop until entity is empty; effective bulk-clear                              |        |
| 16  | Message receive — DLQ       | `asb message receive <target> --dlq [--then]` — receive and settle messages from the dead-letter sub-queue                             |        |
| 17  | Message schedule            | `asb message schedule <target> --at <iso8601>` — schedule future delivery; returns sequence numbers                                    |        |
| 18  | Cancel scheduled message    | `asb message cancel-scheduled <target> --sequence <N>` — cancel a pending scheduled message by sequence number                         |        |
| 19  | Session state read / write  | `asb session state get/set <target> <session-id>` — read and write opaque session state on session-aware entities                      |        |
| 20  | Queue create                | `asb queue create <name> [options]` — create a queue with full property configuration                                                  |        |
| 21  | Queue update                | `asb queue update <name> [options]` — update mutable queue properties                                                                  |        |
| 22  | Queue delete                | `asb queue delete <name> [--yes]` — permanently delete a queue                                                                         |        |
| 23  | Topic create                | `asb topic create <name> [options]` — create a topic                                                                                   |        |
| 24  | Topic update                | `asb topic update <name> [options]` — update mutable topic properties                                                                  |        |
| 25  | Topic delete                | `asb topic delete <name> [--yes]` — permanently delete a topic and all its subscriptions                                               |        |
| 26  | Subscription create         | `asb subscription create <topic> <name> [options]` — create a subscription with optional default rule                                  |        |
| 27  | Subscription update         | `asb subscription update <topic> <name> [options]` — update mutable subscription properties                                            |        |
| 28  | Subscription delete         | `asb subscription delete <topic> <name> [--yes]` — permanently delete a subscription                                                   |        |
| 29  | Rule create                 | `asb rule create <topic> <sub> <name> [--filter-sql \| --filter-correlation] [--action-sql]` — add a filter rule                       |        |
| 30  | Rule update                 | `asb rule update <topic> <sub> <name> [options]` — replace filter or action on an existing rule                                        |        |
| 31  | Rule delete                 | `asb rule delete <topic> <sub> <name> [--yes]` — remove a filter rule                                                                  |        |
