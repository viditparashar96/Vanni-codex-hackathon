#!/usr/bin/env node
/**
 * vaani-mcp — stdio bridge to a Vaani platform MCP endpoint.
 *
 * Every MCP client speaks stdio, so this package makes any Vaani deployment
 * (local or hosted) reachable with one line of config:
 *
 *   npx vaani-mcp
 *
 * Env:
 *   VAANI_API_KEY  — workspace API key (Dashboard → Settings → API Keys)
 *   VAANI_MCP_URL  — platform MCP endpoint
 *                    (default https://vaani.voxavoice.app/api/mcp;
 *                     use http://localhost:4000/api/mcp for local dev)
 *
 * The bridge connects to the endpoint over Streamable HTTP, mirrors its tool
 * list, and forwards every call — so the tool surface always matches the
 * server you point it at.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const VERSION = "0.4.0";
const url = process.env.VAANI_MCP_URL ?? "https://vaani.voxavoice.app/api/mcp";
const apiKey = process.env.VAANI_API_KEY;

async function main(): Promise<void> {
  const upstream = new Client({ name: "vaani-mcp-bridge", version: VERSION });

  try {
    await upstream.connect(
      new StreamableHTTPClientTransport(new URL(url), {
        requestInit: {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        },
      }),
    );
  } catch (error) {
    const hint = apiKey
      ? "Is the Vaani API running and the key valid?"
      : "No VAANI_API_KEY set — required unless the server runs in open dev mode.";
    console.error(`[vaani-mcp] cannot reach ${url}: ${String(error)}\n${hint}`);
    process.exit(1);
  }

  const server = new Server(
    { name: "vaani", version: VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return await upstream.listTools();
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return await upstream.callTool(request.params);
  });

  await server.connect(new StdioServerTransport());
  console.error(`[vaani-mcp] bridging stdio ↔ ${url}`);
}

main().catch((error) => {
  console.error(`[vaani-mcp] fatal: ${String(error)}`);
  process.exit(1);
});
