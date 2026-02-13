#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const EVENT_SITES = {
    pmc: {
        name: "Pan-Mass Challenge",
        baseUrl: "https://www.pmc.org",
        sitemapPath: "/sitemap.xml",
    },
    unpaved: {
        name: "Unpaved",
        baseUrl: "https://www.unpaved.org",
        sitemapPath: "/sitemap.xml",
    },
    wintercycle: {
        name: "Winter Cycle",
        baseUrl: "https://www.wintercycle.org",
        sitemapPath: "/sitemap.xml",
    },
};
const VALID_SITES = Object.keys(EVENT_SITES).join(", ");
// Helper function to fetch content from a URL
async function fetchContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch from ${url}: ${errorMessage}`);
    }
}
// Helper function to parse sitemap XML
function parseSitemap(xml) {
    const urlRegex = /<loc>(.*?)<\/loc>/g;
    const urls = [];
    let match;
    while ((match = urlRegex.exec(xml)) !== null) {
        urls.push(match[1]);
    }
    return urls;
}
// Helper function to extract text content from HTML
function extractTextFromHtml(html) {
    // Remove script and style tags with their content
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');
    // Decode common HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}
// Create server instance
const server = new McpServer({
    name: "event-info-server",
    version: "1.0.0",
});
/**
 * Tool 1: Fetch Sitemap
 * Retrieves and parses the sitemap from an event site
 */
server.registerTool("fetch_sitemap", {
    description: `Fetches and parses the sitemap for a specified event site. ` +
        `Supported sites: ${VALID_SITES}. ` +
        "Returns a list of all URLs found in the sitemap, which can be used to discover event pages.",
    inputSchema: {
        site: z
            .enum(["pmc", "unpaved", "wintercycle"])
            .describe(`The event site to fetch sitemap from. Options: ${VALID_SITES}`),
    },
}, async ({ site }) => {
    try {
        const eventSite = EVENT_SITES[site];
        if (!eventSite) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: Unknown site "${site}". Valid sites are: ${VALID_SITES}`,
                    },
                ],
                isError: true,
            };
        }
        const sitemapUrl = `${eventSite.baseUrl}${eventSite.sitemapPath}`;
        const sitemapXml = await fetchContent(sitemapUrl);
        const urls = parseSitemap(sitemapXml);
        return {
            content: [
                {
                    type: "text",
                    text: `Sitemap for ${eventSite.name} (${urls.length} URLs found):\n\n${urls.join('\n')}`,
                },
            ],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
/**
 * Tool 2: Get Event Page
 * Retrieves content from a specific event page
 */
server.registerTool("get_event_page", {
    description: "Fetches content from a specific event page. " +
        "Provide either a full URL or a relative path. " +
        "The HTML content will be converted to text for easier reading. " +
        "Use fetch_sitemap first to discover available event pages.",
    inputSchema: {
        url: z
            .string()
            .describe("The URL or path to fetch. Can be a full URL (https://...) or relative path (/event/...)"),
        site: z
            .enum(["pmc", "unpaved", "wintercycle"])
            .optional()
            .describe(`The event site (used for relative paths). Options: ${VALID_SITES}`),
        extractText: z
            .boolean()
            .optional()
            .default(true)
            .describe("Whether to extract plain text from HTML (default: true). Set to false to get raw HTML."),
    },
}, async ({ url, site, extractText }) => {
    try {
        // Normalize the URL
        let fetchUrl;
        if (url.startsWith("http://") || url.startsWith("https://")) {
            fetchUrl = url;
        }
        else if (site) {
            const eventSite = EVENT_SITES[site];
            if (!eventSite) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: Unknown site "${site}". Valid sites are: ${VALID_SITES}`,
                        },
                    ],
                    isError: true,
                };
            }
            fetchUrl = url.startsWith("/") ? `${eventSite.baseUrl}${url}` : `${eventSite.baseUrl}/${url}`;
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: Must provide either a full URL or a relative path with a site parameter`,
                    },
                ],
                isError: true,
            };
        }
        const content = await fetchContent(fetchUrl);
        const displayContent = extractText ? extractTextFromHtml(content) : content;
        return {
            content: [
                {
                    type: "text",
                    text: `Content from ${fetchUrl}:\n\n${displayContent}`,
                },
            ],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
/**
 * Tool 3: Search Events
 * Searches for events in the sitemap by URL pattern
 */
server.registerTool("search_events", {
    description: "Searches for event-related URLs in a site's sitemap by matching URL patterns. " +
        "Returns matching URLs that can be used with get_event_page. " +
        "Useful for finding specific events or event types.",
    inputSchema: {
        site: z
            .enum(["pmc", "unpaved", "wintercycle"])
            .describe(`The event site to search. Options: ${VALID_SITES}`),
        pattern: z
            .string()
            .describe("The search pattern to match in URLs (e.g., 'event', 'ride', '2026')"),
        caseInsensitive: z
            .boolean()
            .optional()
            .default(true)
            .describe("Whether to perform case-insensitive search (default: true)"),
    },
}, async ({ site, pattern, caseInsensitive }) => {
    try {
        const eventSite = EVENT_SITES[site];
        if (!eventSite) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: Unknown site "${site}". Valid sites are: ${VALID_SITES}`,
                    },
                ],
                isError: true,
            };
        }
        const sitemapUrl = `${eventSite.baseUrl}${eventSite.sitemapPath}`;
        const sitemapXml = await fetchContent(sitemapUrl);
        const urls = parseSitemap(sitemapXml);
        const searchPattern = caseInsensitive ? pattern.toLowerCase() : pattern;
        const matches = urls.filter(url => {
            const searchUrl = caseInsensitive ? url.toLowerCase() : url;
            return searchUrl.includes(searchPattern);
        });
        if (matches.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No URLs found matching pattern "${pattern}" in the ${eventSite.name} sitemap.`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${matches.length} URL${matches.length === 1 ? "" : "s"} matching "${pattern}" in ${eventSite.name}:\n\n${matches.join('\n')}`,
                },
            ],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
/**
 * Tool 4: List All Events
 * Gets an overview of all event-related URLs from a site
 */
server.registerTool("list_all_events", {
    description: "Lists all URLs from a site's sitemap with optional filtering. " +
        "Provides a complete overview of available pages. " +
        "Use this to discover what events and information are available.",
    inputSchema: {
        site: z
            .enum(["pmc", "unpaved", "wintercycle"])
            .describe(`The event site to list URLs from. Options: ${VALID_SITES}`),
        limit: z
            .number()
            .optional()
            .default(50)
            .describe("Maximum number of URLs to return (default: 50). Set to 0 for no limit."),
    },
}, async ({ site, limit }) => {
    try {
        const eventSite = EVENT_SITES[site];
        if (!eventSite) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: Unknown site "${site}". Valid sites are: ${VALID_SITES}`,
                    },
                ],
                isError: true,
            };
        }
        const sitemapUrl = `${eventSite.baseUrl}${eventSite.sitemapPath}`;
        const sitemapXml = await fetchContent(sitemapUrl);
        const urls = parseSitemap(sitemapXml);
        const limitedUrls = limit > 0 ? urls.slice(0, limit) : urls;
        const hasMore = limit > 0 && urls.length > limit;
        return {
            content: [
                {
                    type: "text",
                    text: `${eventSite.name} - Found ${urls.length} total URLs${hasMore ? ` (showing first ${limit})` : ''}:\n\n${limitedUrls.join('\n')}${hasMore ? `\n\n... and ${urls.length - limit} more` : ''}`,
                },
            ],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Log to stderr (not stdout, which is used for MCP communication)
    console.error("Event Information Server running on stdio");
    console.error("Supported sites:", VALID_SITES);
    console.error("Available tools:");
    console.error("  - fetch_sitemap: Get the sitemap for an event site");
    console.error("  - get_event_page: Fetch a specific event page");
    console.error("  - search_events: Search for events by URL pattern");
    console.error("  - list_all_events: List all URLs from a site");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map