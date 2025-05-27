import { ChainType } from "../config/chain-config";
import { PoolKey } from "../models/blockchain/uniswap-v4/uniswap-v4-types";

// Define interface for Uniswap V3 pool data
interface UniV3PoolData {
  id: string; // This is the pool address
  feeTier: string;
  liquidity: string;
  volumeUSD: string;
  totalValueLockedUSD: string;
  totalValueLockedToken0: string; // Amount of token0 locked in the pool
  totalValueLockedToken1: string; // Amount of token1 locked in the pool
  token0: {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
  };
  token1: {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
  };
}

// Extended interface for pools sorted by input token amount
interface UniV3PoolDataWithInputAmount extends UniV3PoolData {
  inputTokenAmount: number; // Amount of the specific input token in this pool
}

export class TheGraphApi {
  constructor(private readonly apiKey: string) {}

  async getTopUniV3Pool(chain: ChainType, tokenAddress: string, first = 5) {
    let uniV3SubgraphUrl;

    switch (chain) {
      case ChainType.ETH:
        uniV3SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";
        break;
      case ChainType.ARB:
        uniV3SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/FbCGRftH4a3yZugY7TnbYgPJVEv2LvMT6oF1fxPe9aJM";
        break;
      case ChainType.BASE:
        uniV3SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1";
        break;
      default:
        return [];
    }

    // GraphQL query to find pools where the given token is either token0 or token1
    // We use the 'or' operator to search for pools containing the token in either position
    // Ordered by liquidity (L2 liquidity) instead of totalValueLockedUSD because:
    // 1. USD pricing can be unreliable for newer/smaller tokens
    // 2. Raw liquidity is always accurate and represents actual tradeable depth
    // 3. Higher liquidity = better price execution and lower slippage
    const gql = `
      query GetTopPoolsForToken($tokenAddress: String!, $first: Int!) {
        pools(
          first: $first,
          orderBy: liquidity,
          orderDirection: desc,
          where: {
            or: [
              { token0: $tokenAddress },
              { token1: $tokenAddress }
            ]
          }
        ) {
          id
          feeTier
          liquidity
          volumeUSD
          totalValueLockedUSD
          totalValueLockedToken0
          totalValueLockedToken1
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
        }
      }
    `;

    const authHeaders: Record<string, string> = {
      "content-type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const res = await fetch(uniV3SubgraphUrl, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        query: gql,
        variables: {
          tokenAddress: tokenAddress.toLowerCase(), // Ensure lowercase for consistency
          first: first,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`GraphQL error: ${res.status} ${res.statusText}`);
    }

    const { data, errors } = await res.json();
    if (errors && errors.length) {
      console.error(errors);
      throw new Error("Subgraph returned errors");
    }

    // Transform the response data into a more usable format
    const pools: UniV3PoolData[] = data?.pools || [];

    // Convert to PoolKey format or return the raw pool data
    // For now, returning the raw pool data since PoolKey seems to be for V4
    return pools;
  }

  /**
   * Fetch pool for a token pair from the Uniswap V4 subgraph.
   * @param chain - The chain to fetch the pool from.
   * @param token0 - The first token in the pair.
   * @param token1 - The second token in the pair.
   * @param first - The number of pools to fetch.
   * @returns The pool for the token pair.
   */
  async getUniV4PoolKeysForTokens(chain: ChainType, token0: string, token1: string, first = 1000): Promise<PoolKey[]> {
    let uniV4SubgraphUrl;

    switch (chain) {
      case ChainType.ETH:
        uniV4SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G";
        break;
      case ChainType.ARB:
        uniV4SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/G5TsTKNi8yhPSV7kycaE23oWbqv9zzNqR49FoEQjzq1r";
        break;
      case ChainType.BASE:
        uniV4SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/HNCFA9TyBqpo5qpe6QreQABAA1kV8g46mhkCcicu6v2R";
        break;
      default:
        return [];
    }

    const gql = `
      query PoolsByTokens($t0: String!, $t1: String!) {
        pools(where: { token0: $t0, token1: $t1 }, first: ${first}) {
          id
          feeTier
          liquidity
        }
      }
    `;

    const authHeaders: Record<string, string> = {
      "content-type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const res = await fetch(uniV4SubgraphUrl, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ query: gql, variables: { t0: token0, t1: token1 } }),
    });
    if (!res.ok) {
      throw new Error(`GraphQL error: ${res.status} ${res.statusText}`);
    }
    const { data, errors } = await res.json();
    if (errors && errors.length) {
      console.error(errors);
      throw new Error("Subgraph returned errors");
    }
    const result: PoolKey[] = [];
    return result;
  }

  /**
   * Get top Uniswap V3 pools for a token with flexible ordering options
   * @param chain - The blockchain to query
   * @param tokenAddress - The token address to find pools for
   * @param orderBy - Metric to order by: 'liquidity', 'volumeUSD', 'totalValueLockedUSD'
   * @param first - Number of pools to return
   * @returns Array of pool data ordered by the specified metric
   */
  async getTopUniV3PoolsWithOrdering(
    chain: ChainType,
    tokenAddress: string,
    orderBy: "liquidity" | "volumeUSD" | "totalValueLockedUSD" = "liquidity",
    first = 5,
  ) {
    let uniV3SubgraphUrl;

    switch (chain) {
      case ChainType.ETH:
        uniV3SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";
        break;
      case ChainType.ARB:
        uniV3SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/FbCGRftH4a3yZugY7TnbYgPJVEv2LvMT6oF1fxPe9aJM";
        break;
      case ChainType.BASE:
        uniV3SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1";
        break;
      default:
        return [];
    }

    const gql = `
      query GetTopPoolsForTokenWithOrdering($tokenAddress: String!, $first: Int!) {
        pools(
          first: $first,
          orderBy: ${orderBy},
          orderDirection: desc,
          where: {
            or: [
              { token0: $tokenAddress },
              { token1: $tokenAddress }
            ]
          }
        ) {
          id
          feeTier
          liquidity
          volumeUSD
          totalValueLockedUSD
          totalValueLockedToken0
          totalValueLockedToken1
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
        }
      }
    `;

    const authHeaders: Record<string, string> = {
      "content-type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const res = await fetch(uniV3SubgraphUrl, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        query: gql,
        variables: {
          tokenAddress: tokenAddress.toLowerCase(),
          first: first,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`GraphQL error: ${res.status} ${res.statusText}`);
    }

    const { data, errors } = await res.json();
    if (errors && errors.length) {
      console.error(errors);
      throw new Error("Subgraph returned errors");
    }

    const pools: UniV3PoolData[] = data?.pools || [];
    return pools;
  }

  /**
   * Get top Uniswap V3 pools ordered by the amount of the input token locked
   * This is the most relevant metric for trading a specific token as it directly
   * correlates to the depth available for that token's trades
   * @param chain - The blockchain to query
   * @param tokenAddress - The token address to find pools for
   * @param first - Number of pools to return
   * @returns Array of pool data ordered by input token amount (highest first)
   */
  async getTopUniV3PoolsByTokenAmount(
    chain: ChainType,
    tokenAddress: string,
    first = 5,
  ): Promise<UniV3PoolDataWithInputAmount[]> {
    let uniV3SubgraphUrl;

    switch (chain) {
      case ChainType.ETH:
        uniV3SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV";
        break;
      case ChainType.ARB:
        uniV3SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/FbCGRftH4a3yZugY7TnbYgPJVEv2LvMT6oF1fxPe9aJM";
        break;
      case ChainType.BASE:
        uniV3SubgraphUrl = "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1";
        break;
      default:
        return [];
    }

    // Get more pools initially since we'll need to sort them client-side
    // by the specific token amount (GraphQL can't dynamically order by token0 vs token1)
    const gql = `
      query GetPoolsForTokenSorting($tokenAddress: String!, $first: Int!) {
        pools(
          first: $first,
          orderBy: liquidity,
          orderDirection: desc,
          where: {
            or: [
              { token0: $tokenAddress },
              { token1: $tokenAddress }
            ]
          }
        ) {
          id
          feeTier
          liquidity
          volumeUSD
          totalValueLockedUSD
          totalValueLockedToken0
          totalValueLockedToken1
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
        }
      }
    `;

    const authHeaders: Record<string, string> = {
      "content-type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const res = await fetch(uniV3SubgraphUrl, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        query: gql,
        variables: {
          tokenAddress: tokenAddress.toLowerCase(),
          first: Math.max(first * 2, 20), // Get more pools to ensure good sorting
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`GraphQL error: ${res.status} ${res.statusText}`);
    }

    const { data, errors } = await res.json();
    if (errors && errors.length) {
      console.error(errors);
      throw new Error("Subgraph returned errors");
    }

    const pools: UniV3PoolData[] = data?.pools || [];

    // Sort pools by the amount of the input token (either token0 or token1)
    const sortedPools = pools
      .map((pool) => {
        // Determine which token is our input token and get its amount
        const isToken0 = pool.token0.id.toLowerCase() === tokenAddress.toLowerCase();
        const inputTokenAmount = isToken0
          ? parseFloat(pool.totalValueLockedToken0)
          : parseFloat(pool.totalValueLockedToken1);

        return {
          ...pool,
          inputTokenAmount, // Add this for easy access
        };
      })
      .sort((a, b) => b.inputTokenAmount - a.inputTokenAmount) // Sort by input token amount (descending)
      .slice(0, first); // Take only the requested number

    return sortedPools;
  }
}
