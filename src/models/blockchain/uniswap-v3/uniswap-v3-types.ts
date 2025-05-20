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

/**
 * Uniswap V2 Quoter parameter type definitions
 */

/**
 * Parameters for quoting exact input single swaps
 * Gets the expected amount out for swapping an exact amount of input tokens through a single pool
 */
export interface QuoteExactInputSingleParams {
  /** The contract address of the inbound token */
  tokenIn: string;
  /** The contract address of the outbound token */
  tokenOut: string;
  /** The exact amount of input tokens to swap */
  amountIn: bigint;
  /** The fee tier of the pool (in hundredths of a basis point) */
  fee: FeeAmount;
  /** Price limit for the swap */
  sqrtPriceLimitX96: bigint;
}

/**
 * Parameters for quoting exact output single swaps
 * Gets the expected amount in required to receive an exact amount of output tokens through a single pool
 */
export interface QuoteExactOutputSingleParams {
  /** The contract address of the inbound token */
  tokenIn: string;
  /** The contract address of the outbound token */
  tokenOut: string;
  /** The exact amount of output tokens to receive */
  amount: bigint;
  /** The fee tier of the pool (in hundredths of a basis point) */
  fee: FeeAmount;
  /** Price limit for the swap */
  sqrtPriceLimitX96: bigint;
}

export interface QuoterExactInputResponse {
  amountOut: bigint;
  sqrtPriceX96After: bigint;
  initializedTicksCrossed: bigint;
  gasEstimate: bigint;
}

export interface QuoterExactOutputResponse {
  amountIn: bigint;
  sqrtPriceX96After: bigint;
  initializedTicksCrossed: bigint;
  gasEstimate: bigint;
}
