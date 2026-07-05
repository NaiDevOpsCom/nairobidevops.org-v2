# MCP Security Considerations

## Principles

1. **Least privilege** — MCP servers should only have access to what they need
2. **Defense in depth** — MCP is one layer; host-level permissions and sandboxing add more
3. **No secrets in config** — `.mcp.json` is gitignored but still avoid hardcoding tokens

## Transport Security

| Transport | Risk | Mitigation |
|---|---|---|
| stdio | Process-level access | Use allow-listed directories; restrict commands |
| HTTP/SSE | Network exposure | Auth tokens; HTTPS; never expose to public internet |
| WebSocket | Persistent connection | Validate origin; use wss:// |

## Server-Specific Risks

| Server | Risk | Mitigation |
|---|---|---|
| Jetro | Full filesystem access via stdio | Trusted local process; API calls to known endpoint only |
| Filesystem | Write access to allowed dirs | Only pass specific directories; use read-only when possible |

## Environment Variables

- MCP servers can access all env vars of the parent process
- Never put secrets in `.mcp.json` — use environment variables set externally
- Document required env vars per server
