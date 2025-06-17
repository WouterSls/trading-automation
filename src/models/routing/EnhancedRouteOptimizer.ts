import { Wallet } from "ethers";
import { ChainType } from "../../config/chain-config";
import { IDexRouteProvider } from "./route-providers/IDexRouteProvider";
import { UniswapV2RouteProvider } from "./route-providers/UniswapV2RouteProvider";
import { MulticallService } from "./services/MulticallService";
import { EnhancedRoute, RouteQuery, RouteResult, MulticallRequest } from "../trading/types/route-types";

export class EnhancedRouteOptimizer {
  private providers: Map<string, IDexRouteProvider> = new Map();
  private multicallService: MulticallService;

  constructor(private chain: ChainType) {
    this.multicallService = new MulticallService(chain);
    this.initializeProviders();
  }

  /**
   * Initialize all DEX route providers
   */
  private initializeProviders(): void {
    // Add Uniswap V2 provider
    this.addProvider(new UniswapV2RouteProvider(this.chain));

    // TODO: Add other providers
    // this.addProvider(new UniswapV3RouteProvider(this.chain));
    // this.addProvider(new UniswapV4RouteProvider(this.chain));
    // this.addProvider(new SushiSwapRouteProvider(this.chain));
    // this.addProvider(new AerodromeRouteProvider(this.chain));
  }

  /**
   * Add a new DEX route provider
   */
  addProvider(provider: IDexRouteProvider): void {
    const config = provider.getConfiguration();
    const key = `${config.name}-${config.version}`;
    this.providers.set(key, provider);
  }

  /**
   * Remove a DEX route provider
   */
  removeProvider(name: string, version: string): void {
    const key = `${name}-${version}`;
    this.providers.delete(key);
  }

  /**
   * Get all available DEX providers
   */
  getProviders(): IDexRouteProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Find the best route across all DEXes using multicall
   */
  async findBestRoute(
    wallet: Wallet,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    options: {
      maxHops?: number;
      includeDEXes?: string[];
      excludeDEXes?: string[];
      maxRoutes?: number;
    } = {},
  ): Promise<EnhancedRoute | null> {
    const routes = await this.findAllRoutes(wallet, tokenIn, tokenOut, amountIn, options);

    // Return the best route (highest score)
    return routes.length > 0 ? routes[0] : null;
  }

  /**
   * Find all viable routes across all DEXes sorted by score
   */
  async findAllRoutes(
    wallet: Wallet,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    options: {
      maxHops?: number;
      includeDEXes?: string[];
      excludeDEXes?: string[];
      maxRoutes?: number;
    } = {},
  ): Promise<EnhancedRoute[]> {
    const { maxHops = 2, includeDEXes = [], excludeDEXes = [], maxRoutes = 10 } = options;

    // Filter providers based on options
    const activeProviders = this.getActiveProviders(includeDEXes, excludeDEXes);

    if (activeProviders.length === 0) {
      console.warn("No active DEX providers available");
      return [];
    }

    // Generate route queries for all providers
    const routeQueries = await this.generateRouteQueries(activeProviders, tokenIn, tokenOut, amountIn, maxHops);

    if (routeQueries.length === 0) {
      console.warn("No route queries generated");
      return [];
    }

    // Build multicall requests from all providers
    const allRequests = await this.buildMulticallRequests(activeProviders, routeQueries);

    if (allRequests.length === 0) {
      console.warn("No multicall requests generated");
      return [];
    }

    console.log(`Executing ${allRequests.length} multicall requests across ${activeProviders.length} DEXes`);

    // Execute all multicall requests in batches
    const results = await this.multicallService.executeBatch(wallet, allRequests);

    // Process results from all providers
    const allRouteResults = await this.processAllResults(activeProviders, allRequests, results, routeQueries);

    // Filter successful routes and sort by score
    const successfulRoutes = allRouteResults
      .filter((result) => result.success && result.route.score !== undefined)
      .sort((a, b) => (b.route.score || 0) - (a.route.score || 0))
      .slice(0, maxRoutes)
      .map((result) => result.route);

    console.log(`Found ${successfulRoutes.length} viable routes`);

    return successfulRoutes;
  }

  /**
   * Get active providers based on include/exclude lists
   */
  private getActiveProviders(includeDEXes: string[], excludeDEXes: string[]): IDexRouteProvider[] {
    const allProviders = this.getProviders();

    return allProviders.filter((provider) => {
      const config = provider.getConfiguration();
      const dexName = config.name;

      // If include list is specified, only include those DEXes
      if (includeDEXes.length > 0 && !includeDEXes.includes(dexName)) {
        return false;
      }

      // If exclude list is specified, exclude those DEXes
      if (excludeDEXes.length > 0 && excludeDEXes.includes(dexName)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Generate route queries for all providers
   */
  private async generateRouteQueries(
    providers: IDexRouteProvider[],
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    maxHops: number,
  ): Promise<RouteQuery[]> {
    const queries: RouteQuery[] = [];

    for (const provider of providers) {
      const config = provider.getConfiguration();
      const dexName = config.name;

      // Generate a unique route ID for this provider
      const routeId = `${dexName}-${tokenIn}-${tokenOut}-${Date.now()}`;

      queries.push({
        tokenIn,
        tokenOut,
        amountIn,
        dex: dexName,
        routeId,
      });
    }

    return queries;
  }

  /**
   * Build multicall requests from all providers
   */
  private async buildMulticallRequests(
    providers: IDexRouteProvider[],
    queries: RouteQuery[],
  ): Promise<MulticallRequest[]> {
    const allRequests: MulticallRequest[] = [];

    for (const provider of providers) {
      const config = provider.getConfiguration();
      const providerQueries = queries.filter((q) => q.dex === config.name);

      if (providerQueries.length > 0) {
        try {
          const requests = await provider.buildMulticallRequests(providerQueries);
          allRequests.push(...requests);
        } catch (error) {
          console.warn(`Failed to build multicall requests for ${config.name}:`, error);
        }
      }
    }

    return allRequests;
  }

  /**
   * Process results from all providers
   */
  private async processAllResults(
    providers: IDexRouteProvider[],
    requests: MulticallRequest[],
    results: Map<string, any>,
    queries: RouteQuery[],
  ): Promise<RouteResult[]> {
    const allRouteResults: RouteResult[] = [];

    for (const provider of providers) {
      const config = provider.getConfiguration();
      const providerQueries = queries.filter((q) => q.dex === config.name);
      const providerRequests = requests.filter((r) => r.dex === config.name);

      if (providerQueries.length > 0 && providerRequests.length > 0) {
        try {
          const routeResults = await provider.processMulticallResults(providerRequests, results, providerQueries);
          allRouteResults.push(...routeResults);
        } catch (error) {
          console.warn(`Failed to process results for ${config.name}:`, error);
        }
      }
    }

    return allRouteResults;
  }

  /**
   * Get route by specific DEX
   */
  async getRouteForDex(
    wallet: Wallet,
    dexName: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    maxHops: number = 2,
  ): Promise<EnhancedRoute | null> {
    const routes = await this.findAllRoutes(wallet, tokenIn, tokenOut, amountIn, {
      includeDEXes: [dexName],
      maxHops,
      maxRoutes: 1,
    });

    return routes.length > 0 ? routes[0] : null;
  }

  /**
   * Compare routes across different DEXes
   */
  async compareRoutes(
    wallet: Wallet,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
  ): Promise<Map<string, EnhancedRoute | null>> {
    const comparison = new Map<string, EnhancedRoute | null>();

    for (const provider of this.getProviders()) {
      const config = provider.getConfiguration();
      const route = await this.getRouteForDex(wallet, config.name, tokenIn, tokenOut, amountIn);
      comparison.set(config.name, route);
    }

    return comparison;
  }
}
