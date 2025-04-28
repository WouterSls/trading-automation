import { ethers } from "ethers";

const POOL_MANAGER_ABI = [
  /* ========== IMMUTABLES (view) ========== */
  // Protocol fees (IProtocolFees)
  "function protocolFeesAccrued(address currency) view returns (uint256 amount)",
  "function protocolFeeController() view returns (address)",

  // Granular storage (IExtsload / IExttload)
  "function extsload(bytes32 slot) view returns (bytes32 value)",
  "function extsload(bytes32 startSlot, uint256 nSlots) view returns (bytes32[] memory)",
  "function extsload(bytes32[] calldata slots) view returns (bytes32[] memory)",
  "function exttload(bytes32 slot) view returns (bytes32 value)",
  "function exttload(bytes32[] calldata slots) view returns (bytes32[] memory)",

  // ERC-6909 wrapped claims (IERC6909Claims)
  "function balanceOf(address owner, uint256 id) view returns (uint256 amount)",
  "function allowance(address owner, address spender, uint256 id) view returns (uint256)",
  "function isOperator(address owner, address spender) view returns (bool)",

  /* ========== MUTABLES (nonpayable) ========== */
  // Unlock & initialize pools
  "function unlock(bytes calldata data) returns (bytes memory)",
  "function initialize(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) returns (int24 tick)",

  // Liquidity management
  "function modifyLiquidity(tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key, (int24 tickLower,int24 tickUpper,int256 liquidityDelta,bytes32 salt) params, bytes calldata hookData) returns (tuple(int256 callerDelta, int256 feesAccrued))",
  "function swap(tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key, (bool zeroForOne,int256 amountSpecified,uint160 sqrtPriceLimitX96) params, bytes calldata hookData) returns (int256 swapDelta)",
  "function donate(tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key, uint256 amount0, uint256 amount1, bytes calldata hookData) returns (int256)",

  // Balance settlement
  "function sync(address currency) external",
  "function take(address currency, address to, uint256 amount) external",
  "function settle() payable returns (uint256 paid)",
  "function settleFor(address recipient) payable returns (uint256 paid)",
  "function clear(address currency, uint256 amount) external",

  // ERC-6909 mint/burn
  "function mint(address to, uint256 id, uint256 amount) external",
  "function burn(address from, uint256 id, uint256 amount) external",

  // Dynamic fees (IProtocolFees)
  "function setProtocolFee(tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key, uint24 newProtocolFee) external",
  "function setProtocolFeeController(address controller) external",
  "function collectProtocolFees(address recipient, address currency, uint256 amount) external returns (uint256)",

  // Update LP fees
  "function updateDynamicLPFee(tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) key, uint24 newDynamicLPFee) external",
] as const;

const POSITION_MANAGER_ABI = [
  /* ========== IMMUTABLES (view) ========== */
  "function nextTokenId() view returns (uint256)",
  "function getPositionLiquidity(uint256 tokenId) view returns (uint128 liquidity)",
  "function getPoolAndPositionInfo(uint256 tokenId) view returns (tuple(address,uint24,address) poolKey, uint256 info)",
  "function positionInfo(uint256 tokenId) view returns (uint256)",

  /* ========== MUTABLES (nonpayable) ========== */
  "function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable",
  "function modifyLiquiditiesWithoutUnlock(bytes calldata actions, bytes[] calldata params) external payable",
] as const;

const STATE_VIEW_ABI = [
  /* ========== IMMUTABLES (view) ========== */
  "function poolManager() view returns (address)",
  "function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
  "function getTickInfo(bytes32 poolId, int24 tick) view returns (uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128)",
  "function getTickLiquidity(bytes32 poolId, int24 tick) view returns (uint128 liquidityGross, int128 liquidityNet)",
  "function getTickFeeGrowthOutside(bytes32 poolId, int24 tick) view returns (uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128)",
  "function getFeeGrowthGlobals(bytes32 poolId) view returns (uint256 feeGrowthGlobal0, uint256 feeGrowthGlobal1)",
  "function getLiquidity(bytes32 poolId) view returns (uint128 liquidity)",
  "function getTickBitmap(bytes32 poolId, int16 tick) view returns (uint256 tickBitmap)",
  "function getPositionInfo(bytes32 poolId, address owner, int24 tickLower, int24 tickUpper, bytes32 salt) view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128)",
  "function getPositionInfo(bytes32 poolId, bytes32 positionId) view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128)",
  "function getPositionLiquidity(bytes32 poolId, bytes32 positionId) view returns (uint128 liquidity)",
  "function getFeeGrowthInside(bytes32 poolId, int24 tickLower, int24 tickUpper) view returns (uint256 feeGrowthInside0X128, uint256 feeGrowthInside1X128)",
] as const;

export const POOL_MANAGER_INTERFACE = new ethers.Interface(POOL_MANAGER_ABI);
export const POSITION_MANAGER_INTERFACE = new ethers.Interface(POSITION_MANAGER_ABI);
export const STATE_VIEW_INTERFACE = new ethers.Interface(STATE_VIEW_ABI);
