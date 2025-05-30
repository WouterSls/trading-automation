import { ERC20 } from "../../blockchain/ERC/ERC20";
import { ethers, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";

import { UniswapV3QuoterV2 } from "../../blockchain/uniswap-v3/UniswapV3QuoterV2";
import { UniswapV3Factory } from "../../blockchain/uniswap-v3/UniswapV3Factory";
import { UniswapV3SwapRouterV2 } from "../../blockchain/uniswap-v3/UniswapV3SwapRouterV2";
import {
  ensureInfiniteApproval,
  ensureStandardApproval,
  ensurePermit2Approval,
} from "../../../lib/approval-strategies";

import { ITradingStrategy } from "../ITradingStrategy";
import { ERC20_INTERFACE } from "../../../lib/contract-abis/erc20";
import { FeeAmount } from "../../blockchain/uniswap-v3/uniswap-v3-types";
import { BuyTrade, SellTrade, OutputToken, BuyTradeCreationDto, SellTradeCreationDto } from "../types/_index";
import { createMinimalErc20 } from "../../blockchain/ERC/erc-utils";
import { validateNetwork } from "../../../lib/utils";
import { TRADING_CONFIG } from "../../../config/trading-config";

export class UniswapV4Strategy implements ITradingStrategy {
  private quoter: UniswapV3QuoterV2;
  private factory: UniswapV3Factory;
  private router: UniswapV3SwapRouterV2;

  private WETH_ADDRESS: string;
  private USDC_ADDRESS: string;

  constructor(
    private strategyName: string,
    private chain: ChainType,
  ) {
    const chainConfig = getChainConfig(chain);

    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.USDC_ADDRESS = chainConfig.tokenAddresses.usdc;

    this.quoter = new UniswapV3QuoterV2(chain);
    this.factory = new UniswapV3Factory(chain);
    this.router = new UniswapV3SwapRouterV2(chain);
  }

  getName = (): string => this.strategyName;
  getSpenderAddress = (): string => this.router.getRouterAddress();

  async ensureTokenApproval(wallet: Wallet, tokenAddress: string, amount: string): Promise<string | null> {
    await validateNetwork(wallet, this.chain);
    const spender = this.router.getRouterAddress();
    if (TRADING_CONFIG.INFINITE_APPROVAL) {
      return await ensureInfiniteApproval(wallet, tokenAddress, amount, spender);
    } else {
      return await ensureStandardApproval(wallet, tokenAddress, amount, spender);
    }
  }

  async getEthUsdcPrice(wallet: Wallet): Promise<string> {
    throw new Error("Not implemented");
  }
  async getTokenWethLiquidity(wallet: Wallet, tokenAddress: string): Promise<string> {
    try {
      const feeTiers = [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];
      const wethAddress = this.WETH_ADDRESS;

      let bestLiquidity = 0n;

      for (const feeTier of feeTiers) {
        const poolAddress = await this.factory.getPoolAddress(wallet, tokenAddress, wethAddress, feeTier);

        if (!poolAddress || poolAddress === ethers.ZeroAddress) continue;

        const weth = new ethers.Contract(this.WETH_ADDRESS, ERC20_INTERFACE, wallet);
        const ethLiquidity = await weth.balanceOf(poolAddress);

        if (ethLiquidity > bestLiquidity) {
          bestLiquidity = ethLiquidity;
        }
      }

      const ethLiquidityFormatted = ethers.formatEther(bestLiquidity);
      return ethLiquidityFormatted;
    } catch (error) {
      console.error(
        `Error checking V3 liquidity for ${tokenAddress}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return "0";
    }
  }
  async getTokenUsdcPrice(wallet: Wallet, tokenAddress: string): Promise<string> {
    throw new Error("Not implemented");
  }

  async createBuyTransaction(wallet: Wallet, trade: BuyTradeCreationDto): Promise<TransactionRequest> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }

  async createSellTransaction(wallet: Wallet, trade: SellTradeCreationDto): Promise<TransactionRequest> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (error.message.toLowerCase().includes("insufficient funds")) return false;
    if (error.message.toLowerCase().includes("insufficient allowance")) return false;
    if (error.message.toLowerCase().includes("user rejected")) return false;

    // TODO: MOVE TO CONFIG?
    const maxRetries = 3;
    if (attempt >= maxRetries) return false;

    return true;
  }
}
