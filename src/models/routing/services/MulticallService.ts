import { ethers, Contract, Wallet } from "ethers";
import { MulticallRequest } from "../route-types";
import { ChainType, getChainConfig } from "../../../config/chain-config";

export class MulticallService {
  private multicallContract: Contract;
  private maxBatchSize: number = 50;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    const multicallAddress = chainConfig.contracts?.multicall || "0xcA11bde05977b3631167028862bE2a173976CA11"; // Default Multicall3

    // Multicall3 ABI (simplified)
    const multicallAbi = [
      "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) returns (tuple(bool success, bytes returnData)[] returnData)",
    ];

    this.multicallContract = new Contract(multicallAddress, multicallAbi);
  }

  /**
   * Executes batched multicall requests
   * @param wallet Wallet to execute calls with
   * @param requests Array of multicall requests
   * @returns Map of identifier to decoded result
   */
  async executeBatch(wallet: Wallet, requests: MulticallRequest[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    if (requests.length === 0) return results;

    // Split requests into chunks
    const chunks = this.chunkRequests(requests, this.maxBatchSize);

    for (const chunk of chunks) {
      try {
        const batchResults = await this.executeSingleBatch(wallet, chunk);

        // Merge results
        for (const [key, value] of batchResults) {
          results.set(key, value);
        }
      } catch (error) {
        console.error("Multicall batch failed:", error);

        // Fallback: execute failed requests individually
        await this.executeIndividualFallback(wallet, chunk, results);
      }
    }

    return results;
  }

  /**
   * Executes a single batch of multicall requests
   * @param wallet Wallet to execute calls with
   * @param requests Chunk of requests to execute
   * @returns Map of results for this chunk
   */
  private async executeSingleBatch(wallet: Wallet, requests: MulticallRequest[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    const calls = requests.map((req) => ({
      target: req.target,
      allowFailure: true,
      callData: req.callData,
    }));

    const multicallWithSigner = this.multicallContract.connect(wallet);
    const batchResults = await multicallWithSigner.aggregate3(calls);

    // Process results
    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i];
      const request = requests[i];

      if (result.success && result.returnData !== "0x") {
        try {
          const decoded = this.decodeResult(request, result.returnData);
          results.set(request.identifier, decoded);
        } catch (decodeError) {
          console.warn(`Failed to decode result for ${request.identifier}:`, decodeError);
          results.set(request.identifier, null);
        }
      } else {
        console.warn(`Call failed for ${request.identifier}`);
        results.set(request.identifier, null);
      }
    }

    return results;
  }

  /**
   * Fallback to individual calls if batch fails
   * @param wallet Wallet to execute calls with
   * @param requests Failed batch requests
   * @param results Results map to populate
   */
  private async executeIndividualFallback(
    wallet: Wallet,
    requests: MulticallRequest[],
    results: Map<string, any>,
  ): Promise<void> {
    for (const request of requests) {
      try {
        const result = await wallet.call({
          to: request.target,
          data: request.callData,
        });

        if (result && result !== "0x") {
          const decoded = this.decodeResult(request, result);
          results.set(request.identifier, decoded);
        } else {
          results.set(request.identifier, null);
        }
      } catch (error) {
        console.warn(`Individual call failed for ${request.identifier}:`, error);
        results.set(request.identifier, null);
      }
    }
  }

  /**
   * Decodes multicall result based on the request type
   * @param request Original request
   * @param returnData Raw return data
   * @returns Decoded result
   */
  private decodeResult(request: MulticallRequest, returnData: string): any {
    try {
      // This is a simplified decoder - in practice, you'd have more sophisticated
      // decoding logic based on the DEX and query type

      if (request.queryType === "existence") {
        // For pair/pool existence checks, non-zero address means exists
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["address"], returnData);
        return decoded[0] !== ethers.ZeroAddress ? decoded[0] : null;
      }

      if (request.queryType === "quote") {
        // For quotes, expect uint256 amount out
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], returnData);
        return decoded[0];
      }

      if (request.queryType === "liquidity") {
        // For liquidity checks, expect uint256 or tuple
        try {
          // Try single uint256 first
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], returnData);
          return decoded[0];
        } catch {
          // Try tuple for V3-style reserves
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["uint112", "uint112"], returnData);
          return { reserve0: decoded[0], reserve1: decoded[1] };
        }
      }

      // Default: return raw data
      return returnData;
    } catch (error) {
      console.warn("Failed to decode result:", error);
      return null;
    }
  }

  /**
   * Splits requests into chunks for batching
   * @param requests All requests
   * @param chunkSize Maximum chunk size
   * @returns Array of request chunks
   */
  private chunkRequests(requests: MulticallRequest[], chunkSize: number): MulticallRequest[][] {
    const chunks: MulticallRequest[][] = [];

    for (let i = 0; i < requests.length; i += chunkSize) {
      chunks.push(requests.slice(i, i + chunkSize));
    }

    return chunks;
  }

  /**
   * Sets the maximum batch size for multicall requests
   * @param size Maximum number of calls per batch
   */
  setMaxBatchSize(size: number): void {
    this.maxBatchSize = Math.max(1, Math.min(size, 100)); // Reasonable bounds
  }
}
