/**
 * Fee amounts for Uniswap V3 pools
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

export const FeeToTickSpacing = new Map<FeeAmount, number>([
  [FeeAmount.LOWEST, 1],
  [FeeAmount.LOW, 10],
  [FeeAmount.MEDIUM, 60],
  [FeeAmount.HIGH, 200],
]);

/**
 * Uniswap V3 Router contract parameter type definitions
 */

/**
 * Parameters for exact input single swaps on SwapRouter02
 * REMEMBER: deadline is not used on SwapRouter02
 * Swaps an exact amount of one token for as much as possible of another token
 */
export interface ExactInputSingleParams {
  /** The contract address of the inbound token */
  tokenIn: string;
  /** The contract address of the outbound token */
  tokenOut: string;
  /** The fee tier of the pool (in hundredths of a basis point) */
  fee: FeeAmount;
  /** The destination address of the outbound token */
  recipient: string;
  /** The exact amount of the inbound token to swap */
  amountIn: bigint;
  /** The minimum amount of the outbound token to receive */
  amountOutMinimum: bigint;
  /** Price limit for the swap */
  sqrtPriceLimitX96: bigint;
}

/**
 * Parameters for exact input path swaps
 * Swaps an exact amount of one token for as much as possible of another along the specified path
 */
export interface ExactInputParams {
  /** The encoded path of the swap */
  path: string;
  /** The destination address of the outbound token */
  recipient: string;
  /** The exact amount of the inbound token to swap */
  amountIn: bigint;
  /** The minimum amount of the outbound token to receive */
  amountOutMinimum: bigint;
}

/**
 * Parameters for exact output single swaps
 * Swaps as little as possible of one token for an exact amount of another token
 */
export interface ExactOutputSingleParams {
  /** The contract address of the inbound token */
  tokenIn: string;
  /** The contract address of the outbound token */
  tokenOut: string;
  /** The fee tier of the pool (in hundredths of a basis point) */
  fee: FeeAmount;
  /** The destination address of the outbound token */
  recipient: string;
  /** The exact amount of the outbound token to receive */
  amountOut: bigint;
  /** The maximum amount of the inbound token to spend */
  amountInMaximum: bigint;
  /** Price limit for the swap */
  sqrtPriceLimitX96: bigint;
}

/**
 * Parameters for exact output path swaps
 * Swaps as little as possible of one token for an exact amount of another along the specified path
 */
export interface ExactOutputParams {
  /** The encoded path of the swap (reversed) */
  path: string;
  /** The destination address of the outbound token */
  recipient: string;
  /** The exact amount of the outbound token to receive */
  amountOut: bigint;
  /** The maximum amount of the inbound token to spend */
  amountInMaximum: bigint;
}
