import { ethers } from "ethers";

const V3_POOL_ABI = [
  // EVENTS
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",

  // IMMUTABLES
  "function factory() external view returns (address)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function fee() external view returns (uint24)",
  "function tickSpacing() external view returns (int24)",
  "function maxLiquidityPerTick() external view returns (uint128)",

  // MUTABLES
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",

  "function liquidity() external view returns (uint128)",

  "function ticks(int24) external view returns (uint256 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128, int56 tickCumulative, uint16 tickIndex, uint88 community, uint256 blockTimestampLast)",
] as const;

const V3_QUOTER_V2_ABI = [
  "function factory() external view returns (address)",

  "function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",

  "function quoteExactInput(bytes path, uint256 amountIn) external returns (uint256 amountOut, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)",

  "function quoteExactOutputSingle(tuple(address tokenIn, address tokenOut, uint256 amountOut, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",

  "function quoteExactOutput(bytes path, uint256 amountOut) external returns (uint256 amountIn, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)",
] as const;

const V3_FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
  "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
] as const;

const V3_ROUTER_02_ABI = [
  // SWAP FUNCTIONS
  "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",

  "function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)",

  "function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)",

  "function exactOutput(tuple(bytes path, address recipient, uint256 amountOut, uint256 amountInMaximum)) external payable returns (uint256 amountIn)",

  // MULTICALL FUNCTIONS
  "function multicall(uint256 deadline, bytes[] data) external payable returns (bytes[] results)",

  // SELF PERMIT FUNCTIONS (for gasless approvals)
  "function selfPermit(address token, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external payable",

  "function selfPermitIfNecessary(address token, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external payable",

  "function selfPermitAllowed(address token, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external payable",

  "function selfPermitAllowedIfNecessary(address token, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external payable",

  // PAYMENT FUNCTIONS
  "function refundETH() external payable",

  "function sweepToken(address token, uint256 amountMinimum, address recipient) external payable",

  "function sweepTokenWithFee(address token, uint256 amountMinimum, address recipient, uint256 feeBips, address feeRecipient) external payable",

  "function unwrapWETH9(uint256 amountMinimum, address recipient) external payable",

  "function unwrapWETH9WithFee(uint256 amountMinimum, address recipient, uint256 feeBips, address feeRecipient) external payable",

  // APPROVAL FUNCTIONS
  "function approveMax(address token) external payable",

  "function approveMaxMinusOne(address token) external payable",

  "function approveZeroThenMax(address token) external payable",

  "function approveZeroThenMaxMinusOne(address token) external payable",

  // UTILITY FUNCTIONS
  "function pull(address token, uint256 value) external payable",

  "function wrapETH(uint256 value) external payable",

  // IMMUTABLE STATE
  "function factory() external view returns (address)",

  "function factoryV2() external view returns (address)",

  "function positionManager() external view returns (address)",

  "function WETH9() external view returns (address)",
] as const;

export const UNISWAP_V3_POOL_INTERFACE = new ethers.Interface(V3_POOL_ABI);
export const UNISWAP_V3_QUOTER_INTERFACE = new ethers.Interface(V3_QUOTER_V2_ABI);
export const UNISWAP_V3_FACTORY_INTERFACE = new ethers.Interface(V3_FACTORY_ABI);
export const UNISWAP_V3_ROUTER_INTERFACE = new ethers.Interface(V3_ROUTER_02_ABI);
