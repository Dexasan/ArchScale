# ArchScale

An interactive capacity-planning workbench for early system-design decisions. Shape a workload and get an explainable baseline for throughput, storage, topology, reliability, and directional cloud cost.

## Local development

```bash
pnpm install
pnpm dev
```

Production validation:

```bash
pnpm test
pnpm build
```

## What it models

- Monthly and daily active users
- Requests per user and peak traffic concentration
- Read/write distribution
- Response egress
- Retained storage
- Regional footprint
- Availability targets
- Application, database, and cache capacity

ArchScale deliberately exposes its assumptions. It is an estimation aid, not a benchmarking substitute or cloud quote. The pure calculation model is separated from the React interface and covered by unit tests.

## Vercel

The repository includes `vercel.json`; importing it into Vercel requires no additional configuration. The build command is `pnpm build` and output directory is `dist`.

Read the [model assumptions](docs/MODEL.md).
