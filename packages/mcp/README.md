# vaani-mcp

Build, publish and test **voice agents** on a [Vaani](https://github.com/viditparashar96/Vanni-codex-hackathon) platform — from Claude, Cursor, or any MCP client.

```bash
npx vaani-mcp
```

## Configuration

| Env | Meaning | Default |
| --- | --- | --- |
| `VAANI_MCP_URL` | Your Vaani platform's MCP endpoint | `http://localhost:4000/api/mcp` |
| `VAANI_API_KEY` | Bearer key set as `MCP_API_KEY` on the platform | — |

## Claude Desktop

```json
{
  "mcpServers": {
    "vaani": {
      "command": "npx",
      "args": ["-y", "vaani-mcp"],
      "env": {
        "VAANI_MCP_URL": "https://your-vaani-host/api/mcp",
        "VAANI_API_KEY": "vaa_mcp_…"
      }
    }
  }
}
```

## Claude Code

```bash
claude mcp add vaani -e VAANI_MCP_URL=https://your-vaani-host/api/mcp -e VAANI_API_KEY=vaa_mcp_… -- npx -y vaani-mcp
```

## Tools

`list_agents` · `get_agent` · `create_agent` · `update_agent` · `publish_agent` · `start_test_call` · `list_calls` · `get_call` · `get_analytics_summary` · `get_credit_balance`

The bridge mirrors whatever the platform exposes, so new server tools appear automatically.

## Try it

> "Create a voice agent called *Dental Front Desk* that books cleanings, speaks first with a warm greeting — publish it and start a test call."

Your MCP client chains `create_agent → publish_agent → start_test_call` and returns a browser URL you can open and talk to.
