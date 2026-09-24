# Auragen

Auragen is a generative UI platform for AI-assisted user interface generation.

## Project Goal

The project focuses on generating dynamic user interfaces while monitoring user interaction and friction signals.

## Main Components

- AI-assisted UI generation
- Backend code generation
- Generated code safety validation
- Dynamic frontend rendering
- User friction tracking
- WebSocket communication

# AuraGen — Week 1 & Week 2 Code

Implements the Week 1 and Week 2 deliverables from the AuraGen dev plan.

## Structure

```
auragen/
├── backend/                     Node.js + LangChain
│   ├── src/
│   │   ├── codegen/
│   │   │   ├── designSystem.js  Week 1 — Tailwind/component contract fed to the LLM
│   │   │   ├── prompt.js        Week 1 — LangChain prompt template
│   │   │   └── chain.js         Week 1 — LangChain pipeline -> GPT-4o
│   │   ├── safety/
│   │   │   ├── astValidator.js  Week 2 — Babel AST parse + security allowlist
│   │   │   └── astValidator.test.manual.js
│   │   └── server.js            Express + Socket.IO glue (telemetry in, code out)
│   ├── package.json
│   └── .env.example
│
└── frontend/                    Next.js + React
    ├── hooks/
    │   └── useFrictionTracker.js  Week 1 — Friction Engine (cursor velocity,
    │                              hesitation, rage-clicks -> Cognitive Load
    │                              Score), streamed over WebSockets
    ├── components/
    │   ├── DynamicRenderer.jsx  Week 2 — downloads generated source, compiles
    │   │                        it in-browser with Babel Standalone, renders it
    │   └── ui/index.js          Approved component library referenced by the
    │                            design system spec + used inside DynamicRenderer
    ├── lib/socket.js            Shared socket.io client
    ├── pages/index.js           Demo harness wiring all of the above together
    ├── pages/_app.js
    ├── styles/globals.css
    ├── tailwind.config.js
    └── package.json
```

## How the pieces connect

1. **Friction Engine** (`useFrictionTracker`) watches the form container,
   computes a rolling **Cognitive Load Score**, and emits it over a
   WebSocket (`telemetry:update`) every 150ms.
2. The **backend** (`server.js`) watches for a score crossing
   `FRICTION_TRIGGER_THRESHOLD` (default 72) and, once per 5s cooldown,
   calls the **Code-Gen Agent** (`codegen/chain.js`), which prompts
   GPT-4o — constrained by `designSystem.js` — to generate a simplified,
   single-step wizard component as a raw JSX string.
3. That raw string passes through the **AST Injector** safety layer
   (`safety/astValidator.js`): parsed with `@babel/parser`, walked with
   `@babel/traverse` to reject disallowed identifiers/imports/JSX tags
   (`eval`, `fetch`, `document`, `<script>`, non-whitelisted imports,
   etc.), then re-serialized with `@babel/generator`.
4. Validated code is emitted back to the client (`codegen:success`),
   where **`DynamicRenderer`** loads Babel Standalone, compiles the
   string in-browser, and renders it — passing in only `React` and the
   approved `UI` library as scope (no ambient `window`/`document` access
   for the generated component).

## Running locally

```bash
# backend
cd backend
cp .env.example .env   # add your OPENAI_API_KEY
npm install
npm run dev

# frontend (separate terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Then open http://localhost:3000, move your mouse erratically over the
form or click repeatedly in one spot to simulate friction and trigger a
generation.

## Notes / scope

- This covers **Week 1** (Code-Gen Prompting + Telemetry Tracker) and
  **Week 2** (Safety & Compilation + Dynamic Injection) from the plan.
- Week 3 (contextual DOM awareness, morphing animation) and Week 4
  (latency optimization, graceful fallback polish) are not included.
- `DynamicRenderer`'s in-browser compile step is a reasonable Week 2
  starting point; for production you'd likely want a stricter sandbox
  (e.g. a sandboxed iframe or Web Worker) in addition to the AST
  allowlist.
## Backend Health Check

The backend exposes a health endpoint for checking service status:

`GET /health`

The response includes the service name, backend version, and current uptime.
