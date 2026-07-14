import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { requireAuth } from "./middleware/auth.js";
import agentsRouter from "./routes/agents.js";
import callsRouter from "./routes/calls.js";
import internalRouter from "./routes/internal.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

app.use(cors({ origin: [CLIENT_URL], credentials: true }));

// Better Auth mounts its own body parsing — register BEFORE express.json().
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "vaani-api" });
});

// Session-authenticated, org-scoped domains. requireAuth gates the tree; each
// router additionally runs requireOrg to bind + verify the :orgId param.
app.use("/api/orgs/:orgId/agents", requireAuth, agentsRouter);
app.use("/api/orgs/:orgId/calls", requireAuth, callsRouter);

// Cluster-internal engine callbacks (no session auth).
app.use("/api/internal", internalRouter);

app.listen(PORT, () => {
  console.log(`[vaani-api] listening on :${PORT}`);
});
