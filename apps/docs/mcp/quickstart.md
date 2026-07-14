# Vaani MCP server — quickstart

Build and operate voice agents from Claude Code, Claude Desktop, Cursor, or any
MCP client. The server is part of the platform API and exposes the same tables
and dispatch path the dashboard uses — an agent created over MCP shows up in
the UI instantly.

## Endpoint

```
POST http://localhost:4000/api/mcp        (Streamable HTTP, stateless)
Authorization: Bearer <MCP_API_KEY>
```

## Get an API key

**Dashboard → Settings → API & Webhooks → Create key.** The key (`vaa_…`) is
shown once — copy it there. Each key is bound to the workspace it was created
in: MCP requests authenticated with it read and write **that org only**.
Revoking the key in the same screen cuts access immediately.

(Operator fallback: a static `MCP_API_KEY` env on the API still works for
single-tenant dev — it binds to `MCP_ORG_ID` or the first organization.)

## Connect

**Claude Code**

```bash
claude mcp add --transport http vaani http://localhost:4000/api/mcp \
  --header "Authorization: Bearer $MCP_API_KEY"
```

**Cursor / other clients** — add to the MCP config:

```json
{
  "mcpServers": {
    "vaani": {
      "url": "http://localhost:4000/api/mcp",
      "headers": { "Authorization": "Bearer <MCP_API_KEY>" }
    }
  }
}
```

## Tools

| Tool | What it does |
| --- | --- |
| `list_agents` / `get_agent` | Browse the workspace's agents and their configs |
| `create_agent` | New agent + version 1 (system prompt, greeting, voice stack) |
| `update_agent` | New immutable version with patched prompt/voice |
| `publish_agent` | Pin a version live (agent → `active`) |
| `start_test_call` | Boot a real voice pipeline; returns browser test URL + WebRTC offer URL |
| `list_calls` / `get_call` | Call history, transcripts, QA, cost |
| `get_analytics_summary` | Volume / completion / minutes / QA / cost KPIs |
| `get_credit_balance` | Prepaid balance and lifetime totals |

## Try it (in your MCP client)

> "Create a voice agent called *Dental Front Desk* that books cleanings for
> Smile Lane Dental, speaks first with a warm greeting, then publish it and
> start a test call."

The client will chain `create_agent → publish_agent → start_test_call` and hand
you a `testPageUrl` — open it and talk to the agent you just described.

## Notes

- Writes are attributed to the org's owner member (MCP carries no user session).
- Static-key auth is the Phase-1 stand-in; DB-backed hashed `api_keys` with
  scopes replace it without changing the endpoint.
- `start_test_call` needs the voice engine running (`apps/voice-engine`, port
  7860) with provider keys in its `.env`.
