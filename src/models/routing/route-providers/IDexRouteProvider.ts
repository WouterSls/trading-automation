import { Wallet } from "ethers";
import { EnhancedRoute, RouteQuery, MulticallRequest, RouteResult, DexConfiguration } from "../../trading/types/route-types";

export interface IDexRouteProvider {
  /**
   * Gets the configuration for this DEX
   */
  getConfiguration(): DexConfiguration;

  /**
   * Generates all possible routes for a token pair
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @param maxHops Maximum number of hops to consider
   * @returns Array of possible routes
   */
  generateRoutes(tokenIn: string, tokenOut: string, maxHops?: number): Promise<EnhancedRoute[]>;

  /**
   * Builds multicall requests for route queries
   * @param queries Array of route queries to build requests for
   * @returns Array of multicall requests
   */
  buildMulticallRequests(queries: RouteQuery[]): Promise<MulticallRequest[]>;

  /**
   * Processes multicall results and returns route results
   * @param requests Original multicall requests
   * @param results Raw multicall results
   * @param queries Original route queries
   * @returns Processed route results
   */
  processMulticallResults(
    requests: MulticallRequest[],
    results: Map<string, any>,
    queries: RouteQuery[],
  ): Promise<RouteResult[]>;

  /**
   * Calculates a score for a route based on output amount, gas cost, and other factors
   * @param route Route to score
   * @param outputAmount Expected output amount
   * @param gasEstimate Gas estimate for the route
   * @param tokenOutPrice Price of output token in USD (optional)
   * @returns Route score (higher is better)
   */
  calculateRouteScore(route: EnhancedRoute, outputAmount: bigint, gasEstimate: bigint, tokenOutPrice?: number): number;

  /**
   * Gets intermediary tokens commonly used for routing on this DEX
   * @returns Array of intermediary token addresses
   */
  getIntermediaryTokens(): string[];

  /**
   * Checks if a direct route exists between two tokens
   * @param wallet Wallet instance for querying
   * @param tokenIn Input token address
   * @param tokenOut Output token address
   * @returns True if direct route exists
   */
  hasDirectRoute(wallet: Wallet, tokenIn: string, tokenOut: string): Promise<boolean>;
}
