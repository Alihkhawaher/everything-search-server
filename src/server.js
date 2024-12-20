import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const SearchSchema = z.object({
  query: z.string().describe("Search query"),
  scope: z.string().default("C:").describe("Search scope (default: C:)"),
  caseSensitive: z.boolean().default(false).describe("Match case"),
  wholeWord: z.boolean().default(false).describe("Match whole words only"),
  regex: z.boolean().default(false).describe("Use regular expressions"),
  path: z.boolean().default(false).describe("Search in paths"),
  maxResults: z.number().min(1).max(1000).default(32).describe("Maximum number of results (1-1000, default: 32 for HTML, 4294967295 for JSON)"),
  sortBy: z.enum(['name', 'path', 'size', 'date_modified']).default('name').describe("Sort results by"),
  ascending: z.boolean().default(true).describe("Sort in ascending order"),
  offset: z.number().min(0).default(0).describe("Display results from the nth result")
});

// Utility function to format file size
const formatFileSize = (size) => {
  if (!size) return "N/A";

  const bytes = parseInt(size);
  if (isNaN(bytes)) return "N/A";

  const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
};

// Utility function to format date from Windows FILETIME
const formatFileTime = (fileTime) => {
  if (!fileTime || fileTime === "" || fileTime === "0") return "No date";

  try {
    const bigIntTime = BigInt(fileTime);
    if (bigIntTime === 0n) return "No date";

    const windowsMs = bigIntTime / 10000n;
    const epochDiffMs = 11644473600000n;
    const unixMs = Number(windowsMs - epochDiffMs);
    const dateObj = new Date(unixMs);

    // Check if date is valid (not 1980-02-01 which indicates invalid/placeholder date)
    if (dateObj.getFullYear() === 1980 && dateObj.getMonth() === 1 && dateObj.getDate() === 1) {
      return "No date";
    }

    return dateObj.toLocaleString();
  } catch (error) {
    console.error('Date conversion error:', error);
    console.error('Value:', fileTime);
    return "Invalid date";
  }
};

const searchFiles = async (params) => {
  try {
    // Add rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));

    // Properly handle scope concatenation
    const searchQuery = params.scope ?
      params.scope.endsWith('\\') ?
        `${params.scope}${params.query}` :
        `${params.scope}\\${params.query}` :
      params.query;

    const response = await axios.get("http://localhost:8011/", {
      params: {
        search: searchQuery,
        json: 1,
        path_column: 1,
        size_column: 1,
        date_modified_column: 1,
        case: params.caseSensitive ? 1 : 0,
        wholeword: params.wholeWord ? 1 : 0,
        regex: params.regex ? 1 : 0,
        path: params.path ? 1 : 0,
        count: params.maxResults,
        offset: params.offset,
        sort: params.sortBy,
        ascending: params.ascending ? 1 : 0
      },
      timeout: 10000 // 10 second timeout
    });

    // Validate response structure
    if (!response.data || typeof response.data.totalResults === 'undefined') {
      throw new Error('Invalid response from Everything Search API');
    }

    // Handle empty results according to API documentation
    if (!response.data.results) {
      response.data.results = [];
      response.data.totalResults = 0;
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        config: {
          url: error.config?.url,
          params: error.config?.params
        }
      });
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          "Could not connect to Everything Search. Make sure the HTTP server is enabled in Everything's settings (Tools > Options > HTTP Server)."
        );
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error("Everything Search API request timed out. The server might be busy or unresponsive.");
      }
      throw new Error(`Everything Search API error: ${error.message}`);
    }
    console.error('Non-Axios error:', error);
    throw error;
  }
};

export const createServer = async () => {
  const server = new Server(
    {
      name: "everything-search",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {
          search: {
            description: "Search for files using Everything Search",
            inputSchema: zodToJsonSchema(SearchSchema)
          }
        }
      }
    }
  );

  server.setRequestHandler("listTools", async () => ({
    tools: [{
      name: "search",
      description: "Search for files using Everything Search",
      inputSchema: zodToJsonSchema(SearchSchema)
    }]
  }));

  server.setRequestHandler("callTool", async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "search") {
      const validatedArgs = SearchSchema.parse(args);
      const results = await searchFiles(validatedArgs);

      const formattedResults = results.results.length > 0
        ? results.results.map((result) => {
            const size = result.type === "folder" ? "(folder)" : formatFileSize(result.size);
            const date = formatFileTime(result.date_modified);
            return `Name: ${result.name}\nPath: ${result.path}\nSize: ${size}\nModified: ${date}\n`;
          }).join("\n")
        : "No results found";

      const summary = `Found ${results.totalResults} results:\n\n`;

      return {
        content: [{
          type: "text",
          text: summary + formattedResults
        }]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  // Connect transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
};

// Test function to verify server functionality
async function testServer() {
  console.log('Starting server tests...\n');
  
  const server = createServer();
  
  // Test 1: Basic search
  try {
    console.log('Test 1: Basic search');
    const basicSearchResult = await server.handleRequest({
      method: 'callTool',
      params: {
        name: 'search',
        arguments: {
          query: '*.txt',
          maxResults: 5
        }
      }
    });
    console.log('Basic search results:', basicSearchResult.content[0].text);
  } catch (error) {
    console.error('Basic search test failed:', error.message);
  }

  // Test 2: Case sensitive search
  try {
    console.log('\nTest 2: Case sensitive search');
    const caseSensitiveResult = await server.handleRequest({
      method: 'callTool',
      params: {
        name: 'search',
        arguments: {
          query: 'README.md',
          caseSensitive: true,
          maxResults: 5
        }
      }
    });
    console.log('Case sensitive results:', caseSensitiveResult.content[0].text);
  } catch (error) {
    console.error('Case sensitive test failed:', error.message);
  }

  // Test 3: Path search
  try {
    console.log('\nTest 3: Path search');
    const pathSearchResult = await server.handleRequest({
      method: 'callTool',
      params: {
        name: 'search',
        arguments: {
          query: 'Documents',
          path: true,
          maxResults: 5
        }
      }
    });
    console.log('Path search results:', pathSearchResult.content[0].text);
  } catch (error) {
    console.error('Path search test failed:', error.message);
  }

  // Test 4: Sorted search
  try {
    console.log('\nTest 4: Sorted search by size');
    const sortedSearchResult = await server.handleRequest({
      method: 'callTool',
      params: {
        name: 'search',
        arguments: {
          query: '*.mp4',
          sortBy: 'size',
          ascending: false,
          maxResults: 5
        }
      }
    });
    console.log('Sorted search results:', sortedSearchResult.content[0].text);
  } catch (error) {
    console.error('Sorted search test failed:', error.message);
  }

  console.log('\nTests completed');
}

// Start server if this file is executed directly
if (import.meta.url.startsWith('file:')) {
  console.log('Starting Everything Search MCP server...');
  createServer()
    .then(() => console.log('Server running on stdio'))
    .catch(error => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}
