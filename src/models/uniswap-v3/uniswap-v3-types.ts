/**
 * Uniswap V3 Router contract parameter type definitions
 */

/**
 * Parameters for exact input single swaps
 * Swaps an exact amount of one token for as much as possible of another token
 */
export interface ExactInputSingleParams {
  /** The contract address of the inbound token */
  tokenIn: string;
  /** The contract address of the outbound token */
  tokenOut: string;
  /** The fee tier of the pool (in hundredths of a basis point) */
  fee: number;
  /** The destination address of the outbound token */
  recipient: string;
  /** The unix time after which a swap will fail */
  deadline: number;
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
  /** The unix time after which a swap will fail */
  deadline: number;
  /** The exact amount of the inbound token to swap */
  amountIn: string;
  /** The minimum amount of the outbound token to receive */
  amountOutMinimum: string;
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
  fee: number;
  /** The destination address of the outbound token */
  recipient: string;
  /** The unix time after which a swap will fail */
  deadline: number;
  /** The exact amount of the outbound token to receive */
  amountOut: string;
  /** The maximum amount of the inbound token to spend */
  amountInMaximum: string;
  /** Price limit for the swap */
  sqrtPriceLimitX96: string;
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
  /** The unix time after which a swap will fail */
  deadline: number;
  /** The exact amount of the outbound token to receive */
  amountOut: string;
  /** The maximum amount of the inbound token to spend */
  amountInMaximum: string;
} 