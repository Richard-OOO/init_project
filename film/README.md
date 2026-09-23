# AI Film Swarm

Next.js + TypeScript full-stack MVP scaffold for an observable, human-guided film agent swarm.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Current Slice

- Short-story input
- Reader task fan-out with capability-based claiming
- Immutable-style execution Trace in the UI
- Pause/resume control
- Human Story Review gate with an editable proposal
- Typed server API and shared domain contracts

Workers and story extraction are deterministic mocks. SQLite persistence, SSE streaming, real LLM calls, and media generation are intentionally deferred until this interaction loop is validated.
