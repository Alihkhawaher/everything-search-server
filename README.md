# Everything Search MCP Server

An MCP server that provides integration with Everything Search Engine, allowing powerful file search capabilities through the Model Context Protocol.

## Features

- Full text search across files and directories
- Advanced search options:
  - Case sensitive search
  - Whole word matching
  - Regular expressions
  - Path search
- Sorting options:
  - By name
  - By path
  - By size
  - By date modified
- Result formatting:
  - Human-readable file sizes
  - Formatted dates
  - Full file paths

## Prerequisites

- Node.js 16 or higher
- Everything Search Engine with HTTP Server enabled

### Everything Search Configuration

1. Open Everything Search
2. Go to Tools > Options > HTTP Server
3. Enable HTTP Server
4. Set the HTTP Server port to 8011 (this is the default port used by this MCP server)
5. Click OK to save changes

Note: If you need to use a different port, you'll need to modify the port in `src/server.ts` where it connects to `http://127.0.0.1:8011/`

## Installation

```bash
npm install
npm run build
```

## Usage

The server provides a single tool through MCP:

```typescript
use_mcp_tool:
- server_name: everything-search
- tool_name: search
- arguments:
  {
    "query": "search string",          // Required: Text to search for
    "scope": "C:",                     // Optional: Search scope (default: C:)
    "caseSensitive": false,            // Optional: Match case
    "wholeWord": false,                // Optional: Match whole words only
    "regex": false,                    // Optional: Use regular expressions
    "path": false,                     // Optional: Search in paths
    "maxResults": 100,                 // Optional: Max results (1-1000, default: 100)
    "sortBy": "name",                  // Optional: Sort by name/path/size/date_modified
    "ascending": true                  // Optional: Sort direction
  }
```

## Example Searches

1. Basic file search:
```json
{
  "query": "*.txt",
  "maxResults": 5
}
```

2. Advanced search with filters:
```json
{
  "query": "test",
  "scope": "C:\\Users",
  "caseSensitive": true,
  "wholeWord": true,
  "maxResults": 10,
  "sortBy": "date_modified",
  "ascending": false
}
```

3. Regex search in paths:
```json
{
  "query": ".*\\.js$",
  "regex": true,
  "path": true,
  "maxResults": 5
}
```

## License

ISC
