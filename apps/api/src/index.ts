import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { auth } from "./lib/auth.js";
import { requireAuth } from "./middleware/auth.js";
import agentsRouter from "./routes/agents.js";
import callsRouter from "./routes/calls.js";
import analyticsRouter from "./routes/analytics.js";
import creditsRouter from "./routes/credits.js";
import internalRouter from "./routes/internal.js";
import { mcpAuth, resolveMcpContext } from "./mcp/context.js";
import { buildMcpServer } from "./mcp/server.js";

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
app.use("/api/orgs/:orgId/analytics", requireAuth, analyticsRouter);
app.use("/api/orgs/:orgId/credits", requireAuth, creditsRouter);

// Cluster-internal engine callbacks (no session auth).
app.use("/api/internal", internalRouter);

// ── MCP server (PRD §6.17) — API-key auth, Streamable HTTP, stateless ────────
// Each POST is a full MCP exchange: build a per-request server bound to the
// resolved org so any MCP client can build + operate voice agents.
app.post("/api/mcp", mcpAuth, async (req, res) => {
  try {
    const ctx = await resolveMcpContext();
    if (!ctx) {
      res.status(503).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "No organization available — sign up once in the dashboard first" },
        id: null,
      });
      return;
    }
    const server = buildMcpServer(ctx);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[mcp] request failed:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// Stateless server: no SSE stream to resume, no session to delete.
app.get("/api/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed — POST only (stateless)" },
    id: null,
  });
});
app.delete("/api/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed — POST only (stateless)" },
    id: null,
  });
});

app.listen(PORT, () => {
  console.log(`[vaani-api] listening on :${PORT}`);
});
