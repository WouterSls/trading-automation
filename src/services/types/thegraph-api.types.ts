export interface UniV2PoolData {}

export interface UniV3PoolData {
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

export interface UniV3PoolDataWithInputAmount extends UniV3PoolData {
  inputTokenAmount: number; // Amount of the specific input token in this pool
}
