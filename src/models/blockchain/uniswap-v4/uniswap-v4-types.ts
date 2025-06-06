/**
 * Fee amounts for Uniswap V4 pools
 */
export enum FeeAmount {
  /** 0.01% pool fee */
  LOWEST = 100,
  /** 0.05% pool fee */
  LOW = 500,
  /** 0.30% pool fee */
  MEDIUM = 3000,
  /** 1.00% pool fee */
  HIGH = 10000,
}

/**
 * Tickspacing amounts for standard Fees
 */
export const FeeToTickSpacing = new Map<FeeAmount, number>([
  [FeeAmount.LOWEST, 1],
  [FeeAmount.LOW, 10],
  [FeeAmount.MEDIUM, 60],
  [FeeAmount.HIGH, 200],
]);

/**
 * Uniswap V4 Pool Key
 */
export interface PoolKey {
  /** The contract address of the token0 */
  currency0: string;
  /** The contract address of the token1 */
  currency1: string;
  fee: FeeAmount; //uint24
  tickSpacing: number; //uint24
  hooks: string;
}

/**
 * Type for Multi hop swaps
 */
export interface PathSegment {
  intermediateCurrency: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
  hookData: string;
}
