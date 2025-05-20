import { ChainType } from "../config/chain-config";
import { PoolKey } from "../models/blockchain/uniswap-v4/uniswap-v4-types";

export class TheGraphApi {
  constructor(private readonly apiKey: string) {}

  private getV4SubgraphUrl(chain: ChainType): string {
    switch (chain) {
      case ChainType.ETH:
        return "https://gateway.thegraph.com/api/subgraphs/id/DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G";
      case ChainType.ARB:
        return "https://gateway.thegraph.com/api/subgraphs/id/G5TsTKNi8yhPSV7kycaE23oWbqv9zzNqR49FoEQjzq1r";
      case ChainType.BASE:
        return "https://gateway.thegraph.com/api/subgraphs/id/HNCFA9TyBqpo5qpe6QreQABAA1kV8g46mhkCcicu6v2R";
      default:
        throw new Error("Unsupported chain");
    }
  }

  /**
   * Fetch pool for a token pair from the Uniswap V4 subgraph.
   * @param chain - The chain to fetch the pool from.
   * @param token0 - The first token in the pair.
   * @param token1 - The second token in the pair.
   * @param first - The number of pools to fetch.
   * @returns The pool for the token pair.
   */
  async fetchV4PoolKeysByTokens(chain: ChainType, token0: string, token1: string, first = 1000): Promise<PoolKey[]> {
    const gql = `
      query PoolsByTokens($t0: String!, $t1: String!) {
        pools(where: { token0: $t0, token1: $t1 }, first: ${first}) {
          id
          feeTier
          liquidity
        }
      }
    `;

    const url = this.getV4SubgraphUrl(chain);
    const authHeaders: Record<string, string> = {
      "content-type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const res = await fetch(url, {
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
}
