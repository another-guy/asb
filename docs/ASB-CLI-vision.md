# `asb` — Azure Service Bus CLI Spec

## Overview & Philosophy

`asb` is a command-line tool for exploring and manipulating Azure Service Bus namespaces.

Design inspiration: **Docker CLI, not git.**
- Noun-verb structure: `asb queue list`, `asb message peek`
- Singular resource nouns: `queue`, `topic`, `subscription`, `rule`, `message`
- Full English verbs primary (`delete`, not `rm`); short aliases are additive, never the primary name
- Configuration vs. runtime separated: `get` returns entity configuration, `stats` returns live metrics
- Uniform output control via `--output` on every command
- Destructive commands require `--yes` or prompt interactively

---

## SDK Foundation

`asb` wraps two clients from `@azure/service-bus`:

| Client | Plane | Purpose |
|--------|-------|---------|
| `ServiceBusAdministrationClient` | Management | CRUD on namespace, queues, topics, subscriptions, rules |
| `ServiceBusClient` + Sender/Receiver | Data | Send, peek, receive, settle messages; session state |

### Admin-plane SDK methods

| Resource | Methods |
|----------|---------|
| Namespace | `getNamespaceProperties` |
| Queue | `createQueue`, `getQueue`, `getQueueRuntimeProperties`, `listQueues`, `listQueuesRuntimeProperties`, `updateQueue`, `deleteQueue`, `queueExists` |
| Topic | `createTopic`, `getTopic`, `getTopicRuntimeProperties`, `listTopics`, `listTopicsRuntimeProperties`, `updateTopic`, `deleteTopic`, `topicExists` |
| Subscription | `createSubscription`, `getSubscription`, `getSubscriptionRuntimeProperties`, `listSubscriptions`, `listSubscriptionsRuntimeProperties`, `updateSubscription`, `deleteSubscription`, `subscriptionExists` |
| Rule | `createRule`, `getRule`, `listRules`, `updateRule`, `deleteRule`, `ruleExists` |

### Data-plane SDK methods

| Group | Methods |
|-------|---------|
| Send (`ServiceBusSender`) | `sendMessages`, `createMessageBatch`, `scheduleMessages`, `cancelScheduledMessages` |
| Receive (`ServiceBusReceiver`) | `receiveMessages`, `peekMessages`, `receiveDeferredMessages`, `subscribe` / `getMessageIterator` |
| Settle (`ServiceBusReceiver`) | `completeMessage`, `abandonMessage`, `deferMessage`, `deadLetterMessage`, `renewMessageLock` |
| Session (`ServiceBusSessionReceiver`) | all Receiver methods + `getSessionState`, `setSessionState`, `renewSessionLock` |

---

## Authentication

Named profiles are stored in `~/.asb/config` (kubectl-style contexts).  
Ad-hoc flags override the active context for a single invocation.

```
# One-time setup
asb context add prod --connection-string "Endpoint=sb://..."
asb context add staging --namespace ns.servicebus.windows.net   # uses DefaultAzureCredential
asb context add ci --namespace ns.servicebus.windows.net \
    --tenant-id <tid> --client-id <id> --client-secret <secret>

# Manage contexts
asb context list
asb context get [<name>]
asb context use <name>
asb context delete <name>

# Per-invocation override
asb --context staging queue list
asb --connection-string "..." message peek my-queue
```

Env-var fallback (lowest precedence, overridden by flags):
- `ASB_CONNECTION_STRING`
- `ASB_NAMESPACE`
- `ASB_CONTEXT`

---

## Global Options

```
--context, -x <name>         Named auth context
--connection-string <str>    Ad-hoc connection string (overrides context)
--namespace <fqdn>           Ad-hoc namespace FQDN with DefaultAzureCredential
--output, -o <format>        Output format: table (default) | json | yaml
--no-header                  Suppress column headers in table output
--timeout <ms>               Request timeout (default: 60000)
--debug                      Log HTTP requests/responses
```

---

## Addressing Scheme

| Target | Syntax |
|--------|--------|
| Queue | `<queue-name>` |
| Topic subscription (receive) | `<topic-name>/<subscription-name>` |
| Topic (send only) | `<topic-name>` |
| Dead-letter sub-queue | add `--dlq` flag |
| Transfer dead-letter sub-queue | add `--transfer-dlq` flag |

---

## Output Formats

`--output table` (default): human-readable columns, aligned.  
`--output json`: JSON array to stdout; pipeable to `jq`.  
`--output yaml`: YAML document.

`--no-header` suppresses the column header row (table mode only).

---

## Resource Hierarchy

```
asb
├── context        — named auth profiles (~/.asb/config)
├── namespace      — namespace info (singleton)
├── queue          — standalone queue
├── topic          — topic (fan-out)
├── subscription   — subscription on a topic
├── rule           — filter rule on a subscription
├── message        — messaging operations (send / peek / receive / schedule)
└── session        — session state (session-aware entities only)
```

---

## Command Reference

### `namespace`

```
asb namespace info
```

Output fields: `name`, `sku` (Basic / Standard / Premium), `messagingUnits` (Premium only), `createdAt`, `modifiedAt`.

---

### `queue`

```
asb queue list [--stats]
asb queue get <name>
asb queue stats <name>
asb queue create <name> [options]
asb queue update <name> [options]
asb queue delete <name> [--yes]
```

`list` — configuration properties by default; add `--stats` to include runtime message counts.  
`get` — full configuration properties.  
`stats` — runtime properties only (message counts, sizes, timestamps).

**Create / update options:**

| Flag | Description |
|------|-------------|
| `--lock-duration <ISO8601>` | Message lock duration (e.g. `PT1M`) |
| `--max-size <MB>` | Max queue size in megabytes |
| `--max-message-size <KB>` | Max single-message size (Premium only) |
| `--max-delivery-count <N>` | Dead-letter after N failed deliveries |
| `--ttl <ISO8601>` | Default message time-to-live |
| `--dedup` | Enable duplicate detection |
| `--dedup-window <ISO8601>` | Duplicate detection history window |
| `--sessions` | Require sessions (immutable after create) |
| `--dead-letter-on-expiry` | Move expired messages to DLQ |
| `--auto-delete-idle <ISO8601>` | Delete queue after idle period |
| `--forward-to <entity>` | Auto-forward messages to queue or topic |
| `--forward-dlq-to <entity>` | Auto-forward dead-lettered messages |
| `--status <EntityStatus>` | `Active`, `Disabled`, `SendDisabled`, `ReceiveDisabled` |
| `--partitioned` | Enable partitioning (immutable after create) |
| `--metadata <string>` | Free-form user metadata |
| `--batched-operations` | Enable server-side batched operations |

---

### `topic`

```
asb topic list [--stats]
asb topic get <name>
asb topic stats <name>
asb topic create <name> [options]
asb topic update <name> [options]
asb topic delete <name> [--yes]
```

`stats` output includes: `sizeInBytes`, `subscriptionCount`, `scheduledMessageCount`, timestamps.

**Create / update options:** same as queue minus `--lock-duration`, `--sessions`, `--dead-letter-on-expiry`, `--forward-*`; plus:

| Flag | Description |
|------|-------------|
| `--support-ordering` | Guarantee message ordering (requires non-partitioned) |

---

### `subscription`

```
asb subscription list <topic> [--stats]
asb subscription get <topic> <name>
asb subscription stats <topic> <name>
asb subscription create <topic> <name> [options]
asb subscription update <topic> <name> [options]
asb subscription delete <topic> <name> [--yes]
```

`stats` output includes: `activeMessageCount`, `deadLetterMessageCount`, `transferMessageCount`, timestamps.

**Create / update options:**

| Flag | Description |
|------|-------------|
| `--lock-duration <ISO8601>` | Message lock duration |
| `--max-delivery-count <N>` | Dead-letter threshold |
| `--ttl <ISO8601>` | Default message TTL |
| `--dead-letter-on-expiry` | Move expired messages to DLQ |
| `--dead-letter-on-filter-error` | Move messages that fail filter evaluation to DLQ |
| `--sessions` | Require sessions (immutable after create) |
| `--auto-delete-idle <ISO8601>` | Delete subscription after idle period |
| `--forward-to <entity>` | Auto-forward messages |
| `--forward-dlq-to <entity>` | Auto-forward dead-lettered messages |
| `--status <EntityStatus>` | `Active`, `Disabled`, etc. |
| `--metadata <string>` | Free-form user metadata |
| `--batched-operations` | Enable server-side batched operations |
| `--default-rule-name <name>` | Name of the initial default rule (create only) |
| `--default-rule-filter <sql>` | SQL filter for default rule (create only) |

---

### `rule`

```
asb rule list <topic> <subscription>
asb rule get <topic> <subscription> <name>
asb rule create <topic> <subscription> <name> [options]
asb rule update <topic> <subscription> <name> [options]
asb rule delete <topic> <subscription> <name> [--yes]
```

**Filter options (mutually exclusive):**

| Flag | Description |
|------|-------------|
| `--filter-sql <expr>` | SQL 92 filter expression (e.g. `"priority > 5"`) |
| `--filter-correlation` | Correlation filter mode; combine with sub-flags below |

Correlation sub-flags (used with `--filter-correlation`):

```
--correlation-id <id>
--message-id <id>
--to <address>
--reply-to <address>
--subject <label>
--session-id <id>
--reply-to-session-id <id>
--content-type <type>
--app-prop <key>=<value>      (repeatable)
```

**Action option:**

| Flag | Description |
|------|-------------|
| `--action-sql <expr>` | SQL action to modify matched messages |

---

### `message`

**Target:**
- Sending: `<queue-name>` or `<topic-name>`
- Receiving/peeking: `<queue-name>` or `<topic-name>/<subscription-name>`

```
asb message send <target> [options]
asb message peek <target> [options]
asb message receive <target> [options]
asb message schedule <target> --at <iso8601> [send-options]
asb message cancel-scheduled <target> --sequence <N>
```

#### `message send`

| Flag | Description |
|------|-------------|
| `--body <str>` | Message body (or pipe via stdin) |
| `--body-file <path>` | Read body from file |
| `--content-type <type>` | e.g. `application/json` |
| `--message-id <id>` | Unique message identifier |
| `--correlation-id <id>` | Correlation identifier |
| `--session-id <id>` | Session affiliation |
| `--subject <label>` | Application-defined label |
| `--reply-to <address>` | Reply-to address |
| `--ttl <ms>` | Time-to-live in milliseconds |
| `--app-prop <key>=<val>` | Custom application property (repeatable) |
| `--count <N>` | Send N identical messages (default: 1) |

If `--body` and `--body-file` are both absent, `asb` reads body from stdin.

#### `message peek`

| Flag | Description |
|------|-------------|
| `--count <N>` | Max messages to peek (default: 10) |
| `--from-sequence <N>` | Start from this sequence number |
| `--dlq` | Peek from dead-letter sub-queue |
| `--transfer-dlq` | Peek from transfer dead-letter sub-queue |
| `--session <id>` | Peek within a specific session |

Non-destructive. Does not acquire a lock.

#### `message receive`

| Flag | Description |
|------|-------------|
| `--count <N>` | Max messages to receive (default: 1) |
| `--mode <mode>` | `peek-lock` (default) or `receive-and-delete` |
| `--then <action>` | After peek-lock: `complete`, `abandon`, `deadletter`, `defer`, `none` (default: `none` — display and exit without settling) |
| `--timeout <ms>` | Max wait time (default: 5000) |
| `--drain` | Loop until entity is empty (combine with `--then complete` to purge) |
| `--dlq` | Receive from dead-letter sub-queue |
| `--transfer-dlq` | Receive from transfer dead-letter sub-queue |
| `--session <id>` | Receive from a specific session |
| `--next-session` | Accept next available session |

#### `message schedule`

Same flags as `message send`, plus:

| Flag | Description |
|------|-------------|
| `--at <iso8601>` | **Required.** UTC datetime for scheduled delivery |

Returns sequence number(s) for use with `cancel-scheduled`.

#### `message cancel-scheduled`

| Flag | Description |
|------|-------------|
| `--sequence <N>` | Sequence number to cancel (repeatable) |

---

### `session`

For session-aware queues and subscriptions only.

```
asb session state get <target> <session-id>
asb session state set <target> <session-id> --value <json>
```

> Session listing is not possible — the SDK exposes no enumeration API for active sessions.

---

## Common Workflows

**Explore a namespace:**
```bash
asb namespace info
asb queue list --stats
asb topic list --stats
```

**Inspect a queue:**
```bash
asb queue get my-queue
asb queue stats my-queue
asb message peek my-queue --count 10
asb message peek my-queue --dlq --count 10
```

**Inspect a topic subscription:**
```bash
asb subscription list my-topic --stats
asb subscription stats my-topic my-sub
asb message peek my-topic/my-sub --count 10
```

**Send test messages:**
```bash
asb message send my-queue --body '{"event":"test"}' --content-type application/json
echo "hello" | asb message send my-topic --count 5
```

**Purge / drain a queue:**
```bash
asb message receive my-queue --drain --then complete
```

**Inspect and reprocess the dead-letter queue:**
```bash
asb message peek my-queue --dlq --count 20 --output json | jq '.[] | .body'
asb message receive my-queue --dlq --count 5 --then complete
```

**Manage subscription rules:**
```bash
asb rule list my-topic my-sub
asb rule delete my-topic my-sub "\$Default" --yes
asb rule create my-topic my-sub high-priority --filter-sql "priority > 5"
asb rule create my-topic my-sub from-region \
    --filter-correlation --app-prop region=eu-west
```

**Schedule a future message:**
```bash
asb message schedule my-queue --at "2026-06-07T09:00:00Z" \
    --body "morning digest" --subject "digest"
# returns sequence number, e.g. 42
asb message cancel-scheduled my-queue --sequence 42
```

---

## SDK Limitations

The following operations are intentionally absent because the underlying SDK provides no API for them:

| Limitation | Detail |
|------------|--------|
| List active sessions | Only `acceptSession(id)` and `acceptNextSession()` exist; no enumeration |
| Enumerate scheduled messages | Can schedule and cancel by sequence number, but not list pending |
| Message search / filter on receive | Only sequential peek/receive; no server-side content filtering |
| Transfer dead-letter via path | Must use `--transfer-dlq` flag; no addressable queue path |
