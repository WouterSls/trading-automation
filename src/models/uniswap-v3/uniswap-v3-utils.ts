/**
 * Converts sqrtPriceX96 to a human readable price
 * @param sqrtPriceX96 The sqrt price value from the pool
 * @returns The human readable price (token1/token0)
 */
export function calculatePriceFromSqrtPriceX96(sqrtPriceX96: string): number {
    const sqrtPriceX96BigInt = BigInt(sqrtPriceX96);
    
    const numerator = sqrtPriceX96BigInt * sqrtPriceX96BigInt;
    const denominator = 2n ** 192n;
    
    return Number(numerator * 10000000000n / denominator) / 10000000000;
}