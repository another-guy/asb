# Tech Stack

## Core (required)

| Category | Choice | Rationale |
|----------|--------|-----------|
| Node.js version manager | **fnm** | Native PowerShell support; drop-in `.nvmrc` compat; ~40× faster than nvm |
| Runtime | **Node.js** | `@azure/service-bus` is Node-first; widest ecosystem compatibility |
| Package manager | **pnpm** | Fast, strict hoisting catches implicit dependency bugs |
| Language | **TypeScript** | Azure SDK ships first-class TS types; required for correctness at this complexity |
| Dev execution | **tsx** | Runs `.ts` files directly without a separate compile step during development |
| CLI framework | **CommanderJS** | Composable subcommand nesting maps cleanly to the noun-verb command hierarchy |
| Terminal colors | **picocolors** | Zero deps; CJS + ESM; sufficient for success/error/dim/bold use cases |
| Test runner | **Vitest** | Fast; native ESM; Jest-compatible API; TS support out of the box |

## Permitted (opt-in per feature)

These libraries are approved for use when a feature warrants them. They must not be added preemptively.

| Category | Choice | When to reach for it |
|----------|--------|----------------------|
| Spinner | **ora** | Any operation with unpredictable latency (SDK calls, auth) |
| Multi-step progress | **listr2** | Flows with 2+ sequential async steps shown to the user |
| Table (bordered) | **cli-table3** | Default tabular output for list/stats commands |
| Table (plain) | **columnify** | Plain or pipe-delimited output for `--output plain` |
| Unicode symbols | **figures** | Status icons (`✔ ✖ ℹ ⚠`) with automatic Windows fallback |
| Tree rendering | **archy** | Hierarchical output (e.g. topic → subscription → rule trees) |
| Panels / boxes | **boxen** | Highlighted warnings, context summaries, or prominent notices |
