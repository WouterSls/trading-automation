import { ethers } from "ethers";

const UNISWAP_V2_ROUTER_ABI = [
  "function factory() external pure returns (address)",
  "function WETH() external pure returns (address)",
  "function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)",
  "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
  "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin, address[] path, address to, uint256 dealine)",
] as const;

const UNISWAP_V2_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address pair)",
] as const;

const UNISWAP_V2_PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
] as const;

export const UNISWAP_V2_ROUTER_INTERFACE = new ethers.Interface(UNISWAP_V2_ROUTER_ABI);
export const UNISWAP_V2_FACTORY_INTERFACE = new ethers.Interface(UNISWAP_V2_FACTORY_ABI);
export const UNISWAP_V2_PAIR_INTERFACE = new ethers.Interface(UNISWAP_V2_PAIR_ABI);
