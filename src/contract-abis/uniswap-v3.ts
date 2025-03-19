import { ethers } from "ethers";

const UNISWAP_V3_POOL_ABI = [
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 lastFee, uint8 unlocked, uint256 liquidity, int24 tickSpacing, bool initialized)",
  "function liquidity() view returns (uint128)",
  "function ticks(int24) view returns (uint256 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128, int56 tickCumulative, uint16 tickIndex, uint88 community, uint256 blockTimestampLast)",
] as const;

const UNISWAP_V3_QUOTER_ABI = [
  "function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
  "function quoteExactInput(bytes path, uint256 amountIn) external returns (uint256 amountOut, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)",
] as const;

const UNISWAP_V3_FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
  "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
] as const;

export const UNISWAP_V3_POOL_INTERFACE = new ethers.Interface(UNISWAP_V3_POOL_ABI);
export const UNISWAP_V3_QUOTER_INTERFACE = new ethers.Interface(UNISWAP_V3_QUOTER_ABI);
export const UNISWAP_V3_FACTORY_INTERFACE = new ethers.Interface(UNISWAP_V3_FACTORY_ABI);
