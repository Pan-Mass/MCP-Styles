import express from "express";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Design Standards Server - Firebase App Hosting Edition
 * Provides tools to access and query design standards for multiple brands:
 * - PMC (Pan-Mass Challenge)
 * - Unpaved
 * - Winter Cycle
 * - Admin Portal
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load design standards from JSON file
let designStandards: any;
try {
  const designStandardsPath = join(__dirname, "..", "Designstandards.json");
  const designStandardsContent = readFileSync(designStandardsPath, "utf-8");
  designStandards = JSON.parse(designStandardsContent);
} catch (error) {
  console.error("Error loading design standards:", error);
  throw error;
}

const VALID_BRANDS = Object.keys(designStandards.brands).join(", ");

// Helper function to generate CSS from CSS variables
function generateCSSVariables(
  variables: Record<string, any>,
  indent = "  ",
): string {
  let css = ":root {\n";

  function processObject(obj: any, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        processObject(value, prefix);
      } else if (typeof value === "string") {
        css += `${indent}${key}: ${value};\n`;
      }
    }
  }

  processObject(variables);
  css += "}\n";
  return css;
}

// Helper function to generate component CSS
function generateComponentCSS(
  component: string,
  rules: Record<string, any>,
  brandPrefix: string,
): string {
  let css = `.${brandPrefix}-${component} {\n`;

  function processRules(obj: any) {
    for (const [key, value] of Object.entries(obj)) {
      if (key === "css" && typeof value === "string") {
        css += `  ${value}\n`;
      } else if (key === "hover" && typeof value === "object") {
        // Skip hover for main declaration
      } else if (
        typeof value === "object" &&
        value !== null &&
        "css" in value
      ) {
        css += `  ${value.css}\n`;
      }
    }
  }

  processRules(rules);
  css += "}\n";

  // Add hover state if exists
  if (rules.hover) {
    css += `\n.${brandPrefix}-${component}:hover {\n`;
    if (typeof rules.hover.css === "string") {
      css += `  ${rules.hover.css}\n`;
    } else if (typeof rules.hover === "object") {
      for (const [key, value] of Object.entries(rules.hover)) {
        if (key === "css" && typeof value === "string") {
          css += `  ${value}\n`;
        }
      }
    }
    css += "}\n";
  }

  return css;
}

// Helper function to search design standards
function searchDesignStandards(query: string, caseSensitive = false): any[] {
  const results: any[] = [];
  const searchTerm = caseSensitive ? query : query.toLowerCase();

  function searchObject(obj: any, path: string[] = []) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      const pathString = currentPath.join(".");
      const searchKey = caseSensitive ? key : key.toLowerCase();

      if (
        searchKey.includes(searchTerm) ||
        pathString.toLowerCase().includes(searchTerm)
      ) {
        results.push({
          path: pathString,
          key,
          value,
        });
      }

      if (typeof value === "string") {
        const searchValue = caseSensitive ? value : value.toLowerCase();
        if (searchValue.includes(searchTerm)) {
          results.push({
            path: pathString,
            key,
            value,
          });
        }
      } else if (typeof value === "object" && value !== null) {
        searchObject(value, currentPath);
      }
    }
  }

  searchObject(designStandards);
  return results;
}

// Create MCP server factory function
function createMcpServer() {
  const mcp = new McpServer({
    name: "design-standards-server",
    version: "2.0.0",
  });

  /**
   * Tool 1: List Brands
   * Returns a list of all available brands in the design system
   */
  mcp.registerTool(
    "list_brands",
    {
      description:
        `Lists all available brands in the design standards system. ` +
        `Returns brand names, full names, and available design categories.`,
      inputSchema: {},
    },
    async () => {
      try {
        const brands = Object.entries(designStandards.brands).map(
          ([key, brand]: [string, any]) => ({
            id: key,
            name: brand.name,
            shortName: brand.shortName,
            hasCSS: !!brand.css,
            hasSassVariables: !!brand.sassVariables,
            hasAssets: !!brand.assets,
          }),
        );

        return {
          content: [
            {
              type: "text",
              text:
                `Available brands (${brands.length}):\n\n` +
                brands
                  .map(
                    (b) =>
                      `- ${b.id}: ${b.name} (${b.shortName})\n  CSS: ${b.hasCSS}, SASS: ${b.hasSassVariables}, Assets: ${b.hasAssets}`,
                  )
                  .join("\n"),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  /**
   * Tool 2: Get Brand Styles
   * Returns complete design standards for a specific brand
   */
  mcp.registerTool(
    "get_brand_styles",
    {
      description:
        `Gets complete design standards for a specific brand. ` +
        `Supported brands: ${VALID_BRANDS}. ` +
        `Returns all CSS variables, font definitions, assets, and SASS variables if available.`,
      inputSchema: {
        brand: z
          .enum(["pmc", "unpaved", "wintercycle", "admin"])
          .describe(`The brand to get styles for. Options: ${VALID_BRANDS}`),
        format: z
          .enum(["json", "css"])
          .optional()
          .default("json")
          .describe(
            "Output format: 'json' for structured data or 'css' for CSS code (default: json)",
          ),
      },
    },
    async ({ brand, format }) => {
      try {
        const brandData = designStandards.brands[brand];
        if (!brandData) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Unknown brand "${brand}". Valid brands are: ${VALID_BRANDS}`,
              },
            ],
            isError: true,
          };
        }

        if (format === "css") {
          let css = `/* ${brandData.name} - Design Standards */\n\n`;

          // Generate CSS variables
          if (brandData.css) {
            css += `/* CSS Variables */\n`;
            css += `:root {\n`;

            for (const [category, variables] of Object.entries(brandData.css)) {
              if (category === "fontFiles") continue;
              css += `  /* ${category} */\n`;
              for (const [key, value] of Object.entries(
                variables as Record<string, any>,
              )) {
                css += `  ${key}: ${value};\n`;
              }
              css += `\n`;
            }
            css += `}\n`;
          }

          return {
            content: [{ type: "text", text: css }],
          };
        } else {
          return {
            content: [
              { type: "text", text: JSON.stringify(brandData, null, 2) },
            ],
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  /**
   * Tool 3: Get CSS Variables
   * Returns CSS variables for a specific brand and optional category
   */
  mcp.registerTool(
    "get_css_variables",
    {
      description:
        `Gets CSS variables for a specific brand and optionally a specific category ` +
        `(colors, borderRadius, boxShadow, fontFamily). ` +
        `Returns variables in JSON or CSS format.`,
      inputSchema: {
        brand: z
          .enum(["pmc", "unpaved", "wintercycle", "admin"])
          .describe(
            `The brand to get CSS variables for. Options: ${VALID_BRANDS}`,
          ),
        category: z
          .enum([
            "colors",
            "borderRadius",
            "boxShadow",
            "fontFamily",
            "fontFiles",
          ])
          .optional()
          .describe(
            "Specific category to retrieve (optional). If omitted, returns all categories.",
          ),
        format: z
          .enum(["json", "css"])
          .optional()
          .default("json")
          .describe("Output format: 'json' or 'css' (default: json)"),
      },
    },
    async ({ brand, category, format }) => {
      try {
        const brandData = designStandards.brands[brand];
        if (!brandData || !brandData.css) {
          return {
            content: [
              { type: "text", text: `Error: No CSS data for brand "${brand}"` },
            ],
            isError: true,
          };
        }

        const cssData = category
          ? { [category]: brandData.css[category] }
          : brandData.css;

        if (format === "css") {
          let css = `:root {\n`;
          for (const [cat, variables] of Object.entries(cssData)) {
            if (cat === "fontFiles") continue;
            css += `  /* ${cat} */\n`;
            for (const [key, value] of Object.entries(
              variables as Record<string, any>,
            )) {
              css += `  ${key}: ${value};\n`;
            }
            css += `\n`;
          }
          css += `}\n`;
          return {
            content: [{ type: "text", text: css }],
          };
        } else {
          return {
            content: [{ type: "text", text: JSON.stringify(cssData, null, 2) }],
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  /**
   * Tool 4: Get CSS Rules
   * Returns CSS rules for components (buttons, cards, modals, typography, etc.)
   */
  mcp.registerTool(
    "get_css_rules",
    {
      description:
        `Gets CSS rules for UI components from the design standards. ` +
        `Available components: buttons, cards, modals, spacing, typography, accessibility. ` +
        `Returns styling rules with breakpoints and responsive values.`,
      inputSchema: {
        component: z
          .enum([
            "buttons",
            "cards",
            "modals",
            "spacing",
            "typography",
            "mediaQueries",
            "contrast",
            "accessibility",
          ])
          .describe("The component type to get CSS rules for"),
        format: z
          .enum(["json", "css"])
          .optional()
          .default("json")
          .describe("Output format: 'json' or 'css' (default: json)"),
        brand: z
          .enum(["pmc", "unpaved", "wintercycle", "admin"])
          .optional()
          .describe(
            "Optional brand prefix for CSS class names when format is 'css'",
          ),
      },
    },
    async ({ component, format, brand }) => {
      try {
        const componentRules = designStandards.cssRules[component];
        if (!componentRules) {
          return {
            content: [
              { type: "text", text: `Error: Unknown component "${component}"` },
            ],
            isError: true,
          };
        }

        if (
          format === "css" &&
          ["buttons", "cards", "modals"].includes(component)
        ) {
          const prefix = brand || "component";
          const css = generateComponentCSS(component, componentRules, prefix);
          return {
            content: [{ type: "text", text: css }],
          };
        } else {
          return {
            content: [
              { type: "text", text: JSON.stringify(componentRules, null, 2) },
            ],
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  /**
   * Tool 5: Generate Complete CSS
   * Generates complete CSS stylesheet for a brand
   */
  mcp.registerTool(
    "generate_css",
    {
      description:
        `Generates a complete CSS stylesheet for a brand including all variables, ` +
        `component styles, and responsive rules. Ready to use in production.`,
      inputSchema: {
        brand: z
          .enum(["pmc", "unpaved", "wintercycle", "admin"])
          .describe(`The brand to generate CSS for. Options: ${VALID_BRANDS}`),
        includeComponents: z
          .array(z.enum(["buttons", "cards", "modals", "typography"]))
          .optional()
          .describe(
            "Optional list of components to include. If omitted, includes all.",
          ),
      },
    },
    async ({ brand, includeComponents }) => {
      try {
        const brandData = designStandards.brands[brand];
        if (!brandData) {
          return {
            content: [
              { type: "text", text: `Error: Unknown brand "${brand}"` },
            ],
            isError: true,
          };
        }

        let css = `/* ${brandData.name} - Complete Stylesheet */\n`;
        css += `/* Generated: ${new Date().toISOString()} */\n\n`;

        // CSS Variables
        css += `/* ========== CSS Variables ========== */\n`;
        css += `:root {\n`;

        if (brandData.css) {
          for (const [category, variables] of Object.entries(brandData.css)) {
            if (category === "fontFiles") continue;
            css += `  /* ${category} */\n`;
            for (const [key, value] of Object.entries(
              variables as Record<string, any>,
            )) {
              css += `  ${key}: ${value};\n`;
            }
            css += `\n`;
          }
        }

        css += `}\n\n`;

        // Component Styles
        const components = includeComponents || ["buttons", "cards", "modals"];
        for (const component of components) {
          if (designStandards.cssRules[component]) {
            css += `/* ========== ${component.charAt(0).toUpperCase() + component.slice(1)} ========== */\n`;
            css += generateComponentCSS(
              component,
              designStandards.cssRules[component],
              brand,
            );
            css += `\n`;
          }
        }

        return {
          content: [{ type: "text", text: css }],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  /**
   * Tool 6: Search Design Standards
   * Searches through all design standards for a specific term
   */
  mcp.registerTool(
    "search_design_standards",
    {
      description:
        `Searches through all design standards for a specific term or color value. ` +
        `Useful for finding where specific values are used or what options exist for a property.`,
      inputSchema: {
        query: z
          .string()
          .describe(
            "The search term (e.g., 'primary', '#AB292C', 'radius', 'shadow')",
          ),
        caseSensitive: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Whether to perform case-sensitive search (default: false)",
          ),
        maxResults: z
          .number()
          .optional()
          .default(20)
          .describe("Maximum number of results to return (default: 20)"),
      },
    },
    async ({ query, caseSensitive, maxResults }) => {
      try {
        const results = searchDesignStandards(query, caseSensitive);
        const limitedResults = results.slice(0, maxResults);
        const hasMore = results.length > maxResults;

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No results found for "${query}"`,
              },
            ],
          };
        }

        const output =
          `Found ${results.length} result${results.length === 1 ? "" : "s"} for "${query}"${hasMore ? ` (showing first ${maxResults})` : ""}:\n\n` +
          limitedResults
            .map(
              (r) =>
                `Path: ${r.path}\nValue: ${typeof r.value === "object" ? JSON.stringify(r.value, null, 2) : r.value}`,
            )
            .join("\n\n---\n\n");

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  /**
   * Tool 7: Get Usage Guidelines
   * Returns usage guidelines and best practices for design standards
   */
  mcp.registerTool(
    "get_usage_guidelines",
    {
      description:
        `Returns usage guidelines and best practices for implementing the design standards. ` +
        `Includes information about colors, implementation patterns, and accessibility.`,
      inputSchema: {
        category: z
          .enum(["colors", "typography", "spacing", "accessibility", "all"])
          .optional()
          .default("all")
          .describe("Specific usage category (default: all)"),
      },
    },
    async ({ category }) => {
      try {
        const usage =
          category === "all"
            ? designStandards.usage
            : { [category]: designStandards.usage[category] };

        return {
          content: [{ type: "text", text: JSON.stringify(usage, null, 2) }],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

  return mcp;
}

// Create Express app
const app = express();
app.use(express.json());

// Store transports by session ID for reuse
const transports = new Map<string, StreamableHTTPServerTransport>();

// Health check endpoint
app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "design-standards-server",
    version: "2.0.0",
    status: "running",
    endpoints: {
      health: "/healthz",
      mcp: "/mcp",
    },
    supportedBrands: Object.keys(designStandards.brands),
    availableTools: [
      "list_brands",
      "get_brand_styles",
      "get_css_variables",
      "get_css_rules",
      "generate_css",
      "search_design_standards",
      "get_usage_guidelines",
    ],
  });
});

// MCP endpoint - handles both GET (SSE) and POST (messages)
app.all("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id: string) => {
          console.error(`[${id}] Session initialized`);
          transports.set(id, transport!);
        },
      });

      const currentTransport = transport;

      // Clean up on close
      transport.onclose = () => {
        const sid = currentTransport.sessionId;
        if (sid && transports.has(sid)) {
          console.error(`[${sid}] Transport closed, cleaning up`);
          transports.delete(sid);
        }
      };

      // Create and connect a new MCP server instance for this transport
      const mcp = createMcpServer();
      await mcp.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// Start the server
const port = parseInt(process.env.PORT || "8080", 10);
app.listen(port, "0.0.0.0", () => {
  console.error(`Design Standards Server listening on port ${port}`);
  console.error(`Health check: http://0.0.0.0:${port}/healthz`);
  console.error(`MCP endpoint: http://0.0.0.0:${port}/mcp`);
  console.error(`Supported brands: ${VALID_BRANDS}`);
  console.error("Available tools:");
  console.error("  - list_brands: List all available brands");
  console.error("  - get_brand_styles: Get complete styles for a brand");
  console.error(
    "  - get_css_variables: Get CSS variables for a brand/category",
  );
  console.error("  - get_css_rules: Get CSS rules for components");
  console.error("  - generate_css: Generate complete CSS stylesheet");
  console.error("  - search_design_standards: Search through design standards");
  console.error(
    "  - get_usage_guidelines: Get usage guidelines and best practices",
  );
});
