import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ChainType, CHAIN_METADATA } from "../../src/config/chain-config";
import { spawn, ChildProcess } from "child_process";

/**
 * Helper class to manage network forks for testing
 */
export class NetworkForkManager {
  private static hardhatProcess: ChildProcess | null = null;

  /**
   * Create a forked network for testing
   * @param chain The blockchain to fork
   * @returns Promise resolving when the fork is ready
   */
  static async startHardhatFork(chain: ChainType): Promise<void> {
    if (this.hardhatProcess) {
      await this.cleanupHardhatFork();
    }

    const rpcEnvVar = CHAIN_METADATA[chain].envVar;
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

  /**
   * Cleanup and shutdown the fork
   */
  static async cleanupHardhatFork(): Promise<void> {
    if (!this.hardhatProcess) return;
    const pid = this.hardhatProcess.pid!;
    process.kill(-pid, "SIGKILL");
  }
}
