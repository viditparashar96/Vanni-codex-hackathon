# vaani-mcp

Build, publish and test **voice agents** on [Vaani](https://vaani.voxavoice.app) — from Claude, Cursor, or any MCP client.

```bash
npx vaani-mcp
```

## Setup

1. Sign up at **https://vaani.voxavoice.app**
2. **Settings → API Keys → Create key** — copy the `vaa_…` key (shown once)
3. Add the server to your MCP client with `VAANI_API_KEY`

| Env | Meaning | Default |
| --- | --- | --- |
| `VAANI_API_KEY` | Your workspace key from Settings → API Keys | — |
| `VAANI_MCP_URL` | Platform MCP endpoint | `https://vaani.voxavoice.app/api/mcp` |

Point `VAANI_MCP_URL` at `http://localhost:4000/api/mcp` for a local Vaani stack.

## Claude Desktop

```json
{
  "mcpServers": {
    "vaani": {
      "command": "npx",
      "args": ["-y", "vaani-mcp"],
      "env": { "VAANI_API_KEY": "vaa_…" }
    }
  }
}
```

## Claude Code

```bash
claude mcp add vaani -e VAANI_API_KEY=vaa_… -- npx -y vaani-mcp
```

## Codex CLI

```bash
codex mcp add vaani --env VAANI_API_KEY=vaa_… -- npx -y vaani-mcp
```

Or in `~/.codex/config.toml`:

```toml
[mcp_servers.vaani]
command = "npx"
args = ["-y", "vaani-mcp"]
env = { VAANI_API_KEY = "vaa_…" }
```

Codex asks you to approve each Vaani tool call interactively. For headless
`codex exec` runs, MCP calls are auto-denied by Codex's approval gate unless
you explicitly relax its approval policy.

## Cursor

```json
{
  "mcpServers": {
    "vaani": {
      "command": "npx",
      "args": ["-y", "vaani-mcp"],
      "env": { "VAANI_API_KEY": "vaa_…" }
    }
  }
}
```

## Tools

`list_agents` · `get_agent` · `create_agent` · `create_flow_agent` · `validate_flow` · `update_agent` · `publish_agent` · `start_test_call` · `list_calls` · `get_call` · `get_analytics_summary` · `get_credit_balance`

Flow agents are multi-stage conversation graphs (verify → branch → transfer/SMS → end); `validate_flow` returns the platform's exact error list so your client can iterate before creating. The bridge mirrors whatever the platform exposes, so new server tools appear automatically.

## Try it

> "Create a voice agent called *Dental Front Desk* that books cleanings, speaks first with a warm greeting — publish it and start a test call."

Or a multi-stage one:

> "Build a flow agent that verifies the caller's date of birth, then confirms or reschedules their recall appointment, then wraps up — validate the graph first, then publish it."

Your MCP client chains the tools and returns a browser URL you can open and talk to.
