# Filesystem MCP Server (Optional)

Provides secure file access for AI tools with path allow-listing.

## When to Use

- AI tools need read access to specific project files
- Controlled write access to output directories
- Alternative to unrestricted shell access

## Configuration

```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"],
    "env": {}
  }
}
```

## Security

- Only directories passed as arguments are accessible
- Keeps AI tools sandboxed to project files
- No environment variables needed
- Stdio transport (no network ports)

## Status: Optional

Not currently installed. Add to `.mcp.json` when an AI tool requires structured file access beyond what shell commands provide.
