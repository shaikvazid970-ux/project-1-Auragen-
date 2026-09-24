require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const packageInfo = require("../package.json");
const { generateComponent } = require("./codegen/chain");
const { validateAndCompile } = require("./safety/astValidator");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const TRIGGER_THRESHOLD = Number(
  process.env.FRICTION_TRIGGER_THRESHOLD || 72
);

const app = express();
const serverStartedAt = Date.now();
app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
);
app.use(
  express.json()
);

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "auragen-backend",
    version: packageInfo.version,
    uptimeSeconds: Math.floor((Date.now() - serverStartedAt) / 1000),
  })
);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

/**
 * Week 1 - Telemetry Tracker (server side)
 * -----------------------------------------
 * Receives streamed telemetry batches from the frontend's
 * useFrictionTracker hook: { cognitiveLoadScore, reason, stuckField,
 * formState, formSchema }. When the score crosses the trigger threshold,
 * it kicks off the Week 1 Code-Gen Agent, then the Week 2 Safety &
 * Compilation layer, and streams the result back.
 */
io.on("connection", (socket) => {
  const connectedAt = new Date().toISOString();

  console.log(
    `[ws] client connected: ${socket.id} at ${connectedAt}`
  );

  let lastTriggerAt = 0;
  const COOLDOWN_MS = 5000; // avoid spamming GPT-4o on every telemetry tick

  socket.on("telemetry:update", async (payload = {}) => {
    const {
  cognitiveLoadScore,
  reason,
  stuckField,
  formState,
  formSchema,
} = payload;

if (!Number.isFinite(cognitiveLoadScore)) {
  socket.emit("codegen:error", {
    reason: "invalid_telemetry",
    details: "cognitiveLoadScore must be a valid number",
  });
  return;
}

   socket.emit("telemetry:ack", {
  score: cognitiveLoadScore,
});

    const now = Date.now();
    if (cognitiveLoadScore < TRIGGER_THRESHOLD) {
  return;
}
    if (now - lastTriggerAt < COOLDOWN_MS) {
  return;
}
    lastTriggerAt = now;

    socket.emit("codegen:started", {
  stuckField,
  cognitiveLoadScore,
});

    try {
      // --- Week 1: Code-Gen Agent ---
      const rawCode = await generateComponent({
        cognitiveLoadScore,
        frictionReason: reason,
        stuckField,
        formState,
        formSchema,
      });

      // --- Week 2: Safety & Compilation (AST Injector, part 1) ---
      const result = validateAndCompile(rawCode);

      if (!result.ok) {
       console.warn(
  "[safety] rejected generation:",
  result.error.reason,
  result.error.details
);
        socket.emit("codegen:error", {
          reason: result.error.reason,
          details: result.error.details,
        });
        return;
      }

      const generatedAt = new Date().toISOString();

socket.emit("codegen:success", {
  stuckField,
  code: result.code,
  generatedAt,
});
    } catch (err) {
  console.error("[codegen] pipeline failure:", err);
  socket.emit("codegen:error", {
    reason: "pipeline_error",
    details: err.message,
  });
}
 socket.on("disconnect", () => {
  const disconnectedAt = new Date().toISOString();
  console.log(
    `[ws] client disconnected: ${socket.id} at ${disconnectedAt}`
  );
});

server.listen(PORT, () => {
  const startedAt = new Date().toISOString();

  console.log(`AuraGen backend listening on :${PORT}`);
  console.log(`Client origin configured as: ${CLIENT_ORIGIN}`);
  console.log(`Server started at: ${startedAt}`);
});