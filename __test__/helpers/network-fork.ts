import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ChainType, CHAIN_METADATA } from "../../src/config/chain-config";
import { spawn, ChildProcess } from "child_process";

export class NetworkForkManager {
  private static hardhatProcess: ChildProcess | null = null;

  static async startHardhatFork(chain: ChainType): Promise<void> {
    if (this.hardhatProcess) {
      await this.cleanupHardhatFork();
    }

    const rpcEnvVar = CHAIN_METADATA[chain].envVar;
    const rpcUrl = process.env[rpcEnvVar];
    console.log("rpcEnvVar", rpcEnvVar);
    console.log("rpcUrl", rpcUrl);
    if (!process.env[rpcEnvVar]) {
      throw new Error(`Missing RPC URL for chain ${chain}. Set ${rpcEnvVar} in your .env file.`);
    }

    this.hardhatProcess = spawn("npx", ["hardhat", "node", "--fork", process.env[rpcEnvVar]], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });

    await new Promise<void>((resolve, reject) => {
      this.hardhatProcess!.stdout!.on("data", (chunk: Buffer) => {
        const msg = chunk.toString();
        if (msg.includes("Started HTTP and WebSocket JSON-RPC")) {
          resolve(); // node is ready
        }
      });
      this.hardhatProcess!.on("error", reject);
    });
  }

  static async cleanupHardhatFork(): Promise<void> {
    if (!this.hardhatProcess) return;
    const pid = this.hardhatProcess.pid!;
    process.kill(-pid, "SIGKILL");
  }
}
