# Code Style

## TypeScript

- `strict: true` — no implicit `any`, no unchecked nulls.
- Target `ESNext`; module system is `NodeNext` (ESM throughout).
- Unless absolutely necessary, define symbols (constants, types, functions) in such order that the code is read top-to-bottom without forward references. This applies especially to types and interfaces, where the reader benefits from seeing the high-level shape before the details.
- Always use explicit return types on exported functions.
- Prefer `type` over `interface` for plain data shapes; use `interface` when extension or declaration merging is needed.
- No `enum` — use `as const` objects with a derived union type instead.

```ts
// prefer
const OutputFormat = { table: 'table', json: 'json', yaml: 'yaml' } as const;
type OutputFormat = (typeof OutputFormat)[keyof typeof OutputFormat];

// avoid
enum OutputFormat { table = 'table', json = 'json', yaml = 'yaml' }
```

## Imports

- All local imports use the `.js` extension (required by `NodeNext` resolution, even for `.ts` source files).
- Group imports: Node built-ins → third-party → local. One blank line between groups.
- No barrel `index.ts` re-exports unless a subpackage boundary genuinely warrants one.

```ts
import { readFile } from 'node:fs/promises';

import { Command } from 'commander';
import pc from 'picocolors';

import { resolveContext } from './auth/context.js';
```

## File & Directory Layout

```
src/
  index.ts            — program root; no business logic
  commands/
    <noun>/
      index.ts        — registers the noun subcommand
      <verb>.ts       — one file per verb (list, get, create, …)
  auth/               — context loading and credential resolution
  output/             — table/json/yaml formatters
  sdk/                — thin wrappers around @azure/service-bus clients
```

- One Command registration per file; keep Commander wiring at the top, handler logic below or in a separate function.
- Shared utilities live in their logical subdirectory, not a catch-all `utils/`.

## Naming

| Thing                    | Convention      | Example           |
| ------------------------ | --------------- | ----------------- |
| Files                    | kebab-case      | `queue-list.ts`   |
| Exported functions       | camelCase       | `listQueues`      |
| Types / interfaces       | PascalCase      | `QueueStats`      |
| Constants (module-level) | SCREAMING_SNAKE | `DEFAULT_TIMEOUT` |
| CLI flag names           | kebab-case      | `--lock-duration` |

## Commander Pattern

Register a noun subcommand in its `index.ts`, then import and attach verb files there:

```ts
// src/commands/queue/index.ts
import { Command } from 'commander';
import { registerList } from './list.js';

export function registerQueueCommand(parent: Command): void {
  const queue = parent.command('queue').description('Queue operations');
  registerList(queue);
}
```

Each verb file exports a single `register*` function and keeps the action callback inline or delegated to a handler function in the same file:

```ts
// src/commands/queue/list.ts
import { Command } from 'commander';

export function registerList(queue: Command): void {
  queue
    .command('list')
    .description('List queues')
    .option('--stats', 'Include runtime message counts')
    .action(async (opts) => {
      // handler
    });
}
```

## Error Handling

- Throw typed errors from SDK wrappers; catch them at the action boundary (the `.action()` callback).
- Use `pc.red` / `pc.yellow` from `picocolors` for user-visible error and warning output.
- Exit with a non-zero code on failure: `process.exitCode = 1; return;` (avoids abrupt exits that skip cleanup).
- Never swallow errors silently; at minimum log them and set a non-zero exit code.

## Output

- All human-readable output goes to **stdout**; errors and warnings go to **stderr** (`console.error`).
- Respect the `--output` flag on every command: `table` (default), `json`, `yaml`.
- Use `picocolors` for terminal color; import as `import pc from 'picocolors'`.
- Reach for `ora` (spinner) only when an operation has unpredictable latency; see `TECH-STACK.md` for the full approved list.

## Comments

- Write no comments by default.
- Add a comment only when the **why** is non-obvious: a hidden constraint, an SDK quirk, a non-intuitive workaround.
- Never describe what the code does — well-named identifiers do that.

## Tests

- Test files co-locate with source: `queue/list.test.ts` next to `queue/list.ts`.
- Use `describe` → `it` nesting that reads as a sentence: `describe('queue list', () => { it('outputs table by default', …) })`.
- Prefer testing observable behavior (stdout shape, exit code) over implementation details.
- No mocking of the Azure SDK in unit tests that claim to test SDK behavior — use real integration tests or skip.
- Keep each test file focused on one module; avoid shared global state between tests.

## Formatting

No formatter is enforced yet. Until one is, follow these rules manually:

- 2-space indentation.
- Single quotes for strings.
- Trailing commas in multi-line arrays and objects.
- Semicolons.
- Max line length: 100 characters.
