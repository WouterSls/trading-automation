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

    let rpcEnvVar: string = "";
    let forkBlockNumber: number = 0;

    switch (chain) {
      case ChainType.ETH:
        rpcEnvVar = "ETH_RPC_URL";
        forkBlockNumber = 22_344_527;
        break;
      case ChainType.ARB:
        rpcEnvVar = "ARB_RPC_URL";
        forkBlockNumber = 334_908_297;
        break;
      case ChainType.BASE:
        rpcEnvVar = "BASE_RPC_URL";
        forkBlockNumber = 30_005_952;
        break;
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }

    if (!process.env[rpcEnvVar]) {
      throw new Error(`Missing RPC URL for chain ${chain}. Set ${rpcEnvVar} in your .env file.`);
    }

    this.hardhatProcess = spawn("npx", ["hardhat", "node", "--fork", process.env[rpcEnvVar]!], {
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
