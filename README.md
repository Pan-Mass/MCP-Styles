# Event Information Server

A TypeScript-based Model Context Protocol (MCP) server that provides tools for fetching and searching event information from cycling event websites:

- **PMC (Pan-Mass Challenge)** - https://www.pmc.org
- **Unpaved** - https://www.unpaved.org
- **Winter Cycle** - https://www.wintercycle.org

**🚀 Now supports Firebase App Hosting!** Deploy your MCP server to the cloud with SSE transport. See [DEPLOYMENT.md](DEPLOYMENT.md) for complete setup instructions.

## Features

This server exposes four tools for accessing event information from any supported site using sitemap discovery:

1. **fetch_sitemap** - Fetches and parses the sitemap for an event site to discover all available pages
2. **get_event_page** - Fetches content from a specific event page (with automatic HTML to text conversion)
3. **search_events** - Searches for event URLs by pattern matching in the sitemap
4. **list_all_events** - Lists all URLs from a site's sitemap with optional limiting

All tools support a `site` parameter to specify which event site to query: "pmc", "unpaved", or "wintercycle".

## Installation

```bash
npm install
```

## Building

```bash
npm run build
```

## Usage

### With Claude Desktop

Add this configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "event-info-server": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/MCP-EventInfo/build/index.js"]
    }
  }
}
```

### With VS Code

The server can be debugged in VS Code using the MCP configuration in `.vscode/mcp.json`. Open this folder in VS Code with the GitHub Copilot extension installed.

### Direct Usage

You can also run the server directly:

```bash
node build/index.js
```

## Tools

### fetch_sitemap

Retrieves and parses the sitemap from an event site to discover all available pages.

**Parameters**:

- `site`: The event site to fetch sitemap from - "pmc", "unpaved", or "wintercycle" (required)

**Usage in Claude**:

- "Get the PMC sitemap"
- "Show me all pages on unpaved.org"
- "Fetch the Winter Cycle sitemap"

### get_event_page

Fetches content from a specific event page with automatic HTML to text conversion.

**Parameters**:

- `url`: The URL or path to fetch (can be full URL or relative path) (required)
- `site` (optional): The event site (used for relative paths)
- `extractText` (optional): Whether to extract plain text from HTML (default: true)

**Usage in Claude**:

- "Get the PMC event details from https://www.pmc.org/event"
- "Show me /events/2026 from unpaved"
- "Fetch the Winter Cycle race information"

### search_events

Searches for event-related URLs by matching patterns in the sitemap.

**Parameters**:

- `site`: The event site to search - "pmc", "unpaved", or "wintercycle" (required)
- `pattern`: The search pattern to match in URLs (e.g., "event", "ride", "2026") (required)
- `caseInsensitive` (optional): Whether to search case-insensitively (default: true)

**Usage in Claude**:

- "Find all PMC events with '2026' in the URL"
- "Search Unpaved for 'gravel' events"
- "Look for Winter Cycle registration pages"

### list_all_events

Lists all URLs from a site's sitemap with optional limiting.

**Parameters**:

- `site`: The event site to list URLs from - "pmc", "unpaved", or "wintercycle" (required)
- `limit` (optional): Maximum number of URLs to return (default: 50, set to 0 for no limit)

**Usage in Claude**:

- "List all PMC pages"
- "S├── index.ts # Main server implementation (stdio)
  │ └── server.ts # HTTP/SSE server implementation
  ├── build/ # Compiled JavaScript output
  ├── .vscode/
  │ └── mcp.json # VS Code MCP configuration
  ├── package.json
  ├── tsconfig.json
  └── README.md

```

## Debugging in VS Code

1. Open this folder in VS Code
2. Make sure the GitHub Copilot extension is installed
3. The server will be available in Copilot's MCP servers list
4. You can view logs in the Output panel (select "MCP: event-info
├── src/
│   └── index.ts          # Main server implementation
├── build/                # Compiled JavaScript output
├── .vscode/
│   └── mcp.json         # VS Code MCP configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Debugging in VS Code

1. Open this folder in VS Code
2. Make sure the GitHub Copilot extension is installed
3. The server will be available in Copilot's MCP servers list
4. You can view logs in the Output panel (select "MCP: mcp-documentation-server" from the dropdown)

## License

MIT
