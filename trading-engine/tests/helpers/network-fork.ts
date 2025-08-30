import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ChainType } from "../../src/config/chain-config";
import { spawn, ChildProcess } from "child_process";

export class NetworkForkManager {
  private static hardhatProcess: ChildProcess | null = null;

  static async startHardhatFork(chain: ChainType): Promise<void> {
    if (this.hardhatProcess) {
      await this.cleanupHardhatFork();
    }

    let forkNetwork: string;

    switch (chain) {
      case ChainType.ETH:
        forkNetwork = "ethereum";
        break;
      case ChainType.ARB:
        forkNetwork = "arbitrum";
        break;
      case ChainType.BASE:
        forkNetwork = "base";
        break;
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }

    const env = { ...process.env, FORK_NETWORK: forkNetwork };

    this.hardhatProcess = spawn("npx", ["hardhat", "node"], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
      env,
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
    this.hardhatProcess = null;
  }
}
