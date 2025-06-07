import { ethers } from "ethers";

const AERODROME_ROUTER_ABI = [
  // Errors
  "error ETHTransferFailed()",
  "error Expired()",
  "error InsufficientAmount()",
  "error InsufficientAmountA()",
  "error InsufficientAmountADesired()",
  "error InsufficientAmountAOptimal()",
  "error InsufficientAmountB()",
  "error InsufficientAmountBDesired()",
  "error InsufficientLiquidity()",
  "error InsufficientOutputAmount()",
  "error InvalidAmountInForETHDeposit()",
  "error InvalidPath()",
  "error InvalidRouteA()",
  "error InvalidRouteB()",
  "error InvalidTokenInForETHDeposit()",
  "error OnlyWETH()",
  "error PoolDoesNotExist()",
  "error PoolFactoryDoesNotExist()",
  "error SameAddresses()",
  "error ZeroAddress()",

  // Read-only (view/pure) functions
  "function ETHER() view returns (address)",
  "function defaultFactory() view returns (address)",
  "function factoryRegistry() view returns (address)",

  "function getAmountsOut(uint256 amountIn, tuple(address from, address to, bool stable, address factory)[] routes) view returns (uint256[] amounts)",

  "function getReserves(address tokenA, address tokenB, bool stable, address _factory) view returns (uint256 reserveA, uint256 reserveB)",

  "function isTrustedForwarder(address forwarder) view returns (bool)",

  "function poolFor(address tokenA, address tokenB, bool stable, address _factory) view returns (address pool)",

  "function voter() view returns (address)",

  "function weth() view returns (address)",

  // State-changing (nonpayable/payable) functions
  "function swapExactETHForTokens(uint256 amountOutMin, tuple(address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) payable returns (uint256[] amounts)",

  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin, tuple(address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) payable",

  "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) returns (uint256[] amounts)",

  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline)",

  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) returns (uint256[] amounts)",

  "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline)",
] as const;

const AERODROME_FACTORY_ABI = [
  // Errors
  "error FeeInvalid()",
  "error FeeTooHigh()",
  "error InvalidPool()",
  "error NotFeeManager()",
  "error NotPauser()",
  "error NotVoter()",
  "error PoolAlreadyExists()",
  "error SameAddress()",
  "error ZeroAddress()",
  "error ZeroFee()",

  // Events
  "event PoolCreated(address indexed token0, address indexed token1, bool indexed stable, address pool, uint256)",
  "event SetCustomFee(address indexed pool, uint256 fee)",
  "event SetFeeManager(address feeManager)",

  // Read-only (view) functions
  "function MAX_FEE() view returns (uint256)",
  "function ZERO_FEE_INDICATOR() view returns (uint256)",
  "function allPools(uint256) view returns (address)",
  "function allPoolsLength() view returns (uint256)",
  "function customFee(address) view returns (uint256)",
  "function feeManager() view returns (address)",
  "function getFee(address pool, bool _stable) view returns (uint256)",
  //"function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)",
  "function getPool(address tokenA, address tokenB, bool stable) view returns (address)",
  "function implementation() view returns (address)",
  "function isPaused() view returns (bool)",
  "function isPool(address pool) view returns (bool)",
  "function stableFee() view returns (uint256)",
  "function volatileFee() view returns (uint256)",

  // State-changing (nonpayable) functions
  "function createPool(address tokenA, address tokenB, bool stable) returns (address pool)",
  "function createPool(address tokenA, address tokenB, uint24 fee) returns (address pool)",
  "function setCustomFee(address pool, uint256 fee)",
  "function setFee(bool _stable, uint256 _fee)",
  "function setFeeManager(address _feeManager)",
  "function setPauseState(bool _state)",
  "function setPauser(address _pauser)",
  "function setVoter(address _voter)",
] as const;

const AERODROME_PAIR_ABI = [
  "function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint256 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function stable() external view returns (bool)",
  "function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external",
  "function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256)",
] as const;

export const AERODROME_ROUTER_INTERFACE = new ethers.Interface(AERODROME_ROUTER_ABI);
export const AERODROME_FACTORY_INTERFACE = new ethers.Interface(AERODROME_FACTORY_ABI);
export const AERODROME_PAIR_INTERFACE = new ethers.Interface(AERODROME_PAIR_ABI);
