# Jetro MCP Server

The Jetro MCP server provides access to the Jetro AI research platform runtime.

## Configuration

```json
{
  "jetro": {
    "command": "/path/to/jetro/runtime/node",
    "args": ["/path/to/jetro/mcp-server/index.js"],
    "env": {
      "JET_WORKSPACE": "${workspace}",
      "JET_API_URL": "https://api.jetro.ai"
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `jet_render` | Create canvas elements (charts, tables, frames, notes, KPI cards) |
| `jet_canvas` | Manage canvas layout (move, resize, arrange, delete) |
| `jet_query` | Query local DuckDB data |
| `jet_exec` | Execute Python/R code |
| `jet_parse` | Convert documents to markdown (PDF, DOCX, PPTX, XLSX, HTML, EPUB, RTF, EML, images with OCR) |
| `jet_template` | Access report templates |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JET_WORKSPACE` | Yes | Project root directory |
| `JET_API_URL` | Yes | Jetro API endpoint |
| `PATH` | Yes | Must include Jetro runtime directory |

## Security

- Stdio transport (no network ports)
- Full filesystem access via parent process
- API calls to `https://api.jetro.ai` only
- Configured in `.mcp.json` (gitignored)
