import { ethers } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { IDexRouteProvider } from "./IDexRouteProvider";
import { EnhancedRoute, DexConfiguration, RouteMetadata } from "../../trading/types/route-types";

export abstract class BaseRouteProvider implements IDexRouteProvider {
  protected WETH_ADDRESS: string;
  protected USDC_ADDRESS: string;
  protected chainConfig: any;

  constructor(protected chain: ChainType) {
    this.chainConfig = getChainConfig(chain);
    this.WETH_ADDRESS = this.chainConfig.tokenAddresses.weth;
    this.USDC_ADDRESS = this.chainConfig.tokenAddresses.usdc;
  }

  abstract getConfiguration(): DexConfiguration;
  abstract generateRoutes(tokenIn: string, tokenOut: string, maxHops?: number): Promise<EnhancedRoute[]>;
  abstract buildMulticallRequests(queries: any[]): Promise<any[]>;
  abstract processMulticallResults(requests: any[], results: Map<string, any>, queries: any[]): Promise<any[]>;
  abstract hasDirectRoute(wallet: any, tokenIn: string, tokenOut: string): Promise<boolean>;

  /**
   * Gets common intermediary tokens for routing
   */
  getIntermediaryTokens(): string[] {
    return [
      this.WETH_ADDRESS,
      this.USDC_ADDRESS,
      this.chainConfig.tokenAddresses.usdt || ethers.ZeroAddress,
      this.chainConfig.tokenAddresses.dai || ethers.ZeroAddress,
      this.chainConfig.tokenAddresses.wbtc || ethers.ZeroAddress,
    ].filter((addr) => addr !== ethers.ZeroAddress);
  }

  /**
   * Normalizes token addresses (converts ETH to WETH)
   */
  protected normalizeTokenAddress(token: string): string {
    return token === ethers.ZeroAddress ? this.WETH_ADDRESS : token;
  }

  /**
   * Creates base route metadata
   */
  protected createRouteMetadata(dex: string, version: string): RouteMetadata {
    return {
      dex,
      version,
      gasEstimate: 0n,
      liquidityUsd: 0,
      priceImpact: 0,
    };
  }

  /**
   * Generates direct routes between two tokens
   */
  protected async generateDirectRoutes(tokenIn: string, tokenOut: string): Promise<EnhancedRoute[]> {
    const normalizedTokenIn = this.normalizeTokenAddress(tokenIn);
    const normalizedTokenOut = this.normalizeTokenAddress(tokenOut);

    const config = this.getConfiguration();
    const routes: EnhancedRoute[] = [];

    // Generate routes for each supported fee tier
    const feeTiers = config.supportedFeeTiers || [3000]; // Default to 0.3% if not specified

    for (const fee of feeTiers) {
      routes.push({
        path: [normalizedTokenIn, normalizedTokenOut],
        fees: [fee],
        encodedPath: null,
        metadata: this.createRouteMetadata(config.name, config.version),
      });
    }

    return routes;
  }

  /**
   * Generates multi-hop routes through intermediary tokens
   */
  protected async generateMultiHopRoutes(
    tokenIn: string,
    tokenOut: string,
    maxHops: number = 2,
  ): Promise<EnhancedRoute[]> {
    const normalizedTokenIn = this.normalizeTokenAddress(tokenIn);
    const normalizedTokenOut = this.normalizeTokenAddress(tokenOut);

    if (maxHops < 2) return [];

    const routes: EnhancedRoute[] = [];
    const intermediaryTokens = this.getIntermediaryTokens();
    const config = this.getConfiguration();
    const feeTiers = config.supportedFeeTiers || [3000];

    // 2-hop routes through intermediary tokens
    for (const intermediary of intermediaryTokens) {
      if (intermediary === normalizedTokenIn || intermediary === normalizedTokenOut) continue;

      // Try all fee combinations for 2-hop routes
      for (const fee1 of feeTiers) {
        for (const fee2 of feeTiers) {
          routes.push({
            path: [normalizedTokenIn, intermediary, normalizedTokenOut],
            fees: [fee1, fee2],
            encodedPath: null,
            metadata: this.createRouteMetadata(config.name, config.version),
          });
        }
      }
    }

    return routes;
  }

  /**
   * Basic route scoring algorithm
   */
  calculateRouteScore(
    route: EnhancedRoute,
    outputAmount: bigint,
    gasEstimate: bigint,
    tokenOutPrice: number = 1,
  ): number {
    // Convert to numbers for calculation
    const outputValue = Number(outputAmount) / 1e18; // Assuming 18 decimals for simplicity
    const gasValue = Number(gasEstimate) * 20e-9; // Assuming 20 gwei gas price
    const gasCostInUsd = gasValue * 2000; // Assuming $2000 ETH price

    // Base score is output value minus gas cost
    let score = outputValue * tokenOutPrice - gasCostInUsd;

    // Penalty for multi-hop routes (higher gas, more slippage risk)
    const hopPenalty = (route.path.length - 2) * 0.1;
    score -= hopPenalty;

    // Bonus for routes with higher liquidity
    if (route.metadata.liquidityUsd) {
      const liquidityBonus = Math.min(route.metadata.liquidityUsd / 1000000, 1); // Max 1 point bonus
      score += liquidityBonus;
    }

    // Penalty for high price impact
    if (route.metadata.priceImpact) {
      const impactPenalty = route.metadata.priceImpact * 0.01; // 1% impact = 0.01 penalty
      score -= impactPenalty;
    }

    return score;
  }

  /**
   * Generates a unique identifier for a route
   */
  protected generateRouteId(route: EnhancedRoute, dex: string, queryType: string): string {
    const pathStr = route.path.join("-");
    const feesStr = route.fees.join("-");
    return `${dex}-${queryType}-${pathStr}-${feesStr}`;
  }
}
