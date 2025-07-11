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
export interface PathKey {
  intermediateCurrency: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
  hookData: string;
}

/**
 * Enum for V4 pool actions
 * @see https://github.com/Uniswap/v4-periphery/blob/main/src/libraries/Actions.sol
 */
export enum V4PoolAction {
  SWAP_EXACT_IN_SINGLE = "0x06",
  SWAP_EXACT_IN = "0x07",
  SWAP_EXACT_OUT_SINGLE = "0x08",
  SWAP_EXACT_OUT = "0x09",
  SETTLE = "0x0b",
  SETTLE_ALL = "0x0c",
  TAKE = "0x0e",
  TAKE_ALL = "0x0f",
}

export enum V4PoolActionConstants {
  OPEN_DELTA = 0,
}

// Type-safe parameter types for each pool action
export type SwapExactInputSingleParams = [
  poolKey: PoolKey,
  zeroForOne: boolean,
  amountIn: bigint,
  amountOutMinimum: bigint,
  hookData: string,
];

export type SettleAllSingleParams = [inputCurrency: string, amountIn: bigint, zeroForOne: boolean];
export type SettleAllParams = [inputCurrency: string, amountIn: bigint];

export type TakeAllParams = [outputCurrency: string, recipient: string, amount: number];

// Discriminated union for type-safe pool action parameters
export type PoolActionParams =
  | { action: V4PoolAction.SWAP_EXACT_IN_SINGLE; params: SwapExactInputSingleParams }
  | { action: V4PoolAction.SETTLE_ALL; params: SettleAllParams }
  | { action: V4PoolAction.SETTLE_ALL; params: SettleAllSingleParams }
  | { action: V4PoolAction.TAKE_ALL; params: TakeAllParams };