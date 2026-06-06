# project-service-bus

A custom Node.js CLI tool (`asb`) for exploring and manipulating Azure Service Bus namespaces. Wraps `@azure/service-bus` with a Docker-style noun-verb interface.

## Development

```bash
pnpm build          # compile TypeScript → dist/
pnpm test           # run Vitest test suite
pnpm dev -- --help  # run CLI via tsx without a build step
```

### Testing the CLI as an end user

The entry point is `src/bin.ts` → `dist/bin.js` (separate from `src/index.ts` so tests can import the program without triggering `parse()`).

```bash
# One-time global install
pnpm build
pnpm link --global

# After any source change
pnpm build          # re-compile; the global `asb` command picks it up immediately
```

`asb` then works in **CMD** and **PowerShell** via the pnpm-generated `.cmd` wrapper.  
In **Git Bash** add an alias (the shell wrapper pnpm generates uses WSL-style paths):

```bash
echo 'alias asb="node /c/code/learn-claude/project-service-bus/dist/bin.js"' >> ~/.bashrc
source ~/.bashrc
```

## Reference

| Document | Description | Location |
|----------|-------------|----------|
| ASB CLI Vision | Full CLI spec: command hierarchy, flags, auth model, workflows, SDK limitations | `docs/ASB-CLI-vision.md` |
| Execution Plan | Prioritized feature list with status tracking; setup/exploration first, admin last | `docs/EXECUTION-PLAN.md` |
| Tech Stack | Required and permitted dependencies with rationale | `docs/TECH-STACK.md` |
| Code Style | TypeScript conventions, file layout, naming, Commander pattern, tests | `docs/CODE-STYLE.md` |
