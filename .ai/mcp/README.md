# MCP (Model Context Protocol) Configuration

MCP servers provide tools and resources to AI assistants. This directory documents all MCP servers available for the NDC project.

## Active Servers

| Server | Protocol | Purpose | Status |
|---|---|---|---|
| Jetro | stdio | AI research platform tools (render, canvas, query, parse, template) | Active |
| Filesystem | (planned) | Secure file access for AI tools | Optional |

## Configuration Files

MCP configs live in `.mcp.json` files at various levels. All are gitignored — this directory is the canonical documentation.

| File | Scope |
|---|---|
| `.mcp.json` | Root workspace |
| `.cursor/mcp.json` | Cursor-specific |

## Adding a New Server

1. Add the server entry to `.mcp.json` at the appropriate scope level
2. Document the server in `.ai/mcp/servers/`
3. Run `npm run sync` if adding new AI workspace content

## Security Notes

- MCP servers inherit the host process permissions — limit to read-only where possible
- Stdio servers are preferred over network servers (no open ports)
- Document all environment variables each server requires
- Never commit `.mcp.json` files — they contain local paths and env-specific config
