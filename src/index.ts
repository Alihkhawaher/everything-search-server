#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main() {
  try {
    const server = await createServer();

    process.on("SIGINT", async () => {
      try {
        await server.close();
        console.error("Server shutdown complete");
      } catch (error) {
        console.error("Error during shutdown:", error);
      }
      process.exit(0);
    });

    // Handle uncaught errors
    process.on("uncaughtException", async (error) => {
      console.error("Uncaught exception:", error);
      try {
        await server.close();
      } catch (closeError) {
        console.error("Error during shutdown:", closeError);
      }
      process.exit(1);
    });

    process.on("unhandledRejection", async (error) => {
      console.error("Unhandled rejection:", error);
      try {
        await server.close();
      } catch (closeError) {
        console.error("Error during shutdown:", closeError);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
