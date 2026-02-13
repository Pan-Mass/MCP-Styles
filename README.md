# Design Standards Server

A TypeScript-based Model Context Protocol (MCP) server that provides tools for accessing and querying design standards and style guidelines for multiple brands:

- **PMC (Pan-Mass Challenge)**
- **Unpaved**
- **Winter Cycle**
- **Admin Portal**

**🚀 Now supports Firebase App Hosting!** Deploy your MCP server to the cloud with SSE transport. See [DEPLOYMENT.md](DEPLOYMENT.md) for complete setup instructions.

## Features

This server exposes seven tools for accessing design standards from the centralized `Designstandards.json` file:

1. **list_brands** - Lists all available brands with their capabilities
2. **get_brand_styles** - Gets complete design standards for a specific brand (JSON or CSS format)
3. **get_css_variables** - Gets CSS variables for a brand/category (colors, typography, etc.)
4. **get_css_rules** - Gets CSS rules for UI components (buttons, cards, modals, etc.)
5. **generate_css** - Generates a complete production-ready CSS stylesheet for a brand
6. **search_design_standards** - Searches through all design standards for specific terms
7. **get_usage_guidelines** - Returns usage guidelines and best practices

All tools support brand parameters: "pmc", "unpaved", "wintercycle", or "admin".

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
    "design-standards-server": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/MCP-Styles/build/index.js"]
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

### list_brands

Lists all available brands in the design standards system with their capabilities.

**Parameters**: None

**Usage in Claude**:

- "List all available brands"
- "What brands are supported?"
- "Show me all design systems"

### get_brand_styles

Gets complete design standards for a specific brand including CSS variables, font definitions, and assets.

**Parameters**:

- `brand`: The brand to get styles for - "pmc", "unpaved", "wintercycle", or "admin" (required)
- `format`: Output format - "json" or "css" (optional, default: "json")

**Usage in Claude**:

- "Get PMC brand styles"
- "Show me Unpaved design standards in CSS format"
- "Get all Winter Cycle styles as JSON"

### get_css_variables

Gets CSS variables for a specific brand and optionally a specific category.

**Parameters**:

- `brand`: The brand to get CSS variables for (required)
- `category`: Specific category - "colors", "borderRadius", "boxShadow", "fontFamily", or "fontFiles" (optional)
- `format`: Output format - "json" or "css" (optional, default: "json")

**Usage in Claude**:

- "Get PMC color variables"
- "Show me Unpaved typography CSS variables"
- "What are the Winter Cycle border radius values?"

### get_css_rules

Gets CSS rules for UI components from the design standards.

**Parameters**:

- `component`: Component type - "buttons", "cards", "modals", "spacing", "typography", "mediaQueries", "contrast", or "accessibility" (required)
- `format`: Output format - "json" or "css" (optional, default: "json")
- `brand`: Brand prefix for CSS class names when format is "css" (optional)

**Usage in Claude**:

- "Get button CSS rules"
- "Show me card styling in CSS format for PMC"
- "What are the typography rules?"

### generate_css

Generates a complete production-ready CSS stylesheet for a brand.

**Parameters**:

- `brand`: The brand to generate CSS for (required)
- `includeComponents`: Array of components to include - ["buttons", "cards", "modals", "typography"] (optional, default: all)

**Usage in Claude**:

- "Generate complete CSS for PMC"
- "Create a stylesheet for Unpaved with buttons and cards"
- "Generate Winter Cycle CSS"

### search_design_standards

Searches through all design standards for specific terms or values.

**Parameters**:

- `query`: The search term (e.g., "primary", "#AB292C", "radius", "shadow") (required)
- `caseSensitive`: Whether to perform case-sensitive search (optional, default: false)
- `maxResults`: Maximum number of results to return (optional, default: 20)

**Usage in Claude**:

- "Find all uses of the primary color"
- "Search for '#AB292C' in the design standards"
- "Where is box-shadow used?"

### get_usage_guidelines

Returns usage guidelines and best practices for implementing the design standards.

**Parameters**:

- `category`: Specific usage category - "colors", "typography", "spacing", "accessibility", or "all" (optional, default: "all")

**Usage in Claude**:

- "Get color usage guidelines"
- "Show me accessibility best practices"
- "What are the implementation guidelines?"

## Project Structure

```
MCP-Styles/
├── src/
│   ├── index.ts          # Main server implementation (stdio)
│   └── server.ts         # HTTP/SSE server implementation
├── build/                # Compiled JavaScript output
├── Designstandards.json  # Design standards data
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
4. You can view logs in the Output panel (select "MCP: design-standards-server" from the dropdown)

## License

MIT
