import { ethers } from "ethers";

/**
 * Currency is a Uniswap V4 user-defined value type over address
 * Medium
 *
 * PoolKey is the struct that uniquely identifies a pool (currencies, fee, tickSpacing, hooks)
 * GitHub
 *
 * BalanceDelta is an int256 packing two int128 deltas (amount0, amount1)
 */
const POOL_MANAGER_ABI = [
  // --- unlocking (entry-point for all state-changing calls) ---
  "function unlock(bytes data) external returns (bytes)",

  // --- pool lifecycle ---
  "function initialize((address,address,uint24,int24,address) key, uint160 sqrtPriceX96) external returns (int24 tick)",

  // --- liquidity management ---
  "function modifyLiquidity((address,address,uint24,int24,address) key, (int24 tickLower,int24 tickUpper,int256 liquidityDelta,bytes32 salt) params, bytes hookData) external returns (int256 callerDelta, int256 feesAccrued)",

  // --- swaps & donations ---
  "function swap((address,address,uint24,int24,address) key, (bool zeroForOne,int256 amountSpecified,uint160 sqrtPriceLimitX96) params, bytes hookData) external returns (int256 swapDelta)",
  "function donate((address,address,uint24,int24,address) key, uint256 amount0, uint256 amount1, bytes hookData) external returns (int256)",

  // --- flash-accounting helpers ---
  "function sync(address currency) external",
  "function take(address currency, address to, uint256 amount) external",
  "function settle() external payable returns (uint256 paid)",
  "function settleFor(address recipient) external payable returns (uint256 paid)",
  "function clear(address currency, uint256 amount) external",

  // --- ERC-6909 support via mint/burn ---
  "function mint(address to, uint256 id, uint256 amount) external",
  "function burn(address from, uint256 id, uint256 amount) external",

  // --- dynamic fee control ---
  "function updateDynamicLPFee((address,address,uint24,int24,address) key, uint24 newDynamicLPFee) external",
] as const;

const POSITION_MANAGER_ABI = [
  "function name() view returns (string)",
  "function poolKeys(bytes32 poolId) view returns (bytes32[])",
] as const;

const STATE_MANAGER_ABI = [
  "function poolManager() view returns (address)",
  "function getPoolKey(bytes32 poolId) external view returns (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)",
] as const;

export const POOL_MANAGER_INTERFACE = new ethers.Interface(POOL_MANAGER_ABI);
export const POSITION_MANAGER_INTERFACE = new ethers.Interface(POSITION_MANAGER_ABI);
export const STATE_MANAGER_INTERFACE = new ethers.Interface(STATE_MANAGER_ABI);
