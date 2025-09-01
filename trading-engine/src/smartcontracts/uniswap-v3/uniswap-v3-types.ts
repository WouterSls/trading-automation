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