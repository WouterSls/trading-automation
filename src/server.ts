import dotenv from "dotenv";
import path from "path";
import http from "http";

import app from "./app";

import { ethers } from "ethers";
import { Services } from "./services";
import { runMigrations } from "./lib/db/migration";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const PORT = process.env.PORT || 8080;
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const BASE_RPC_URL = process.env.BASE_RPC_URL || "";
const PRIVATE_KEY = process.env.MS_KEY || "";

async function startServer() {
  try {
    // Run migrations
    await runMigrations();

    // Initialize services
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const services = Services.getInstance(provider, wallet, BASESCAN_API_KEY);
    await services.initialize();

    // Create HTTP server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
    });

    process.on("SIGINT", async () => {
      console.log("Gracefully shutting down server...");

      await services.shutdown();

      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

startServer();
