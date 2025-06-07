import { ERC20 } from "../../smartcontracts/ERC/ERC20";
import { ethers, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";

import { FeeToTickSpacing, PoolKey } from "../../smartcontracts/uniswap-v4/uniswap-v4-types";
import {
  ensureInfiniteApproval,
  ensureStandardApproval,
  ensurePermit2Approval,
} from "../../../lib/approval-strategies";

import { ITradingStrategy } from "../ITradingStrategy";
import { ERC20_INTERFACE } from "../../../lib/smartcontract-abis/erc20";
import { FeeAmount } from "../../smartcontracts/uniswap-v3/uniswap-v3-types";
import {
  BuyTrade,
  SellTrade,
  OutputToken,
  BuyTradeCreationDto,
  SellTradeCreationDto,
  TradeQuote,
} from "../types/_index";
import { createMinimalErc20 } from "../../smartcontracts/ERC/erc-utils";
import { validateNetwork } from "../../../lib/utils";
import { TRADING_CONFIG } from "../../../config/trading-config";
import { UniswapV4Quoter } from "../../smartcontracts/uniswap-v4/UniswapV4Quoter";
import { UniversalRouter } from "../../smartcontracts/universal-router/UniversalRouter";

export class UniswapV4Strategy implements ITradingStrategy {
  private quoter: UniswapV4Quoter;
  private router: UniversalRouter;

  private WETH_ADDRESS: string;
  private USDC_ADDRESS: string;

  private WETH_DECIMALS = 18;
  private USDC_DECIMALS = 6;

  constructor(
    private strategyName: string,
    private chain: ChainType,
  ) {
    const chainConfig = getChainConfig(chain);

    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.USDC_ADDRESS = chainConfig.tokenAddresses.usdc;

    this.quoter = new UniswapV4Quoter(chain);
    this.router = new UniversalRouter(chain);
  }

  /**
   * Gets the name of this trading strategy
   * @returns The strategy name
   */
  getName = (): string => this.strategyName;

  /**
   * Ensures token approval for trading operations
   * @param wallet Connected wallet to use for approval
   * @param tokenAddress Address of the token to approve
   * @param amount Amount to approve (threshold validation or standard approval calculation )
   * @returns gas cost of approval if needed , null if already approved
   */
  async ensureTokenApproval(wallet: Wallet, tokenAddress: string, amount: string): Promise<string | null> {
    await validateNetwork(wallet, this.chain);
    const spender = this.router.getRouterAddress();
    if (TRADING_CONFIG.INFINITE_APPROVAL) {
      return await ensureInfiniteApproval(wallet, tokenAddress, amount, spender);
    } else {
      return await ensureStandardApproval(wallet, tokenAddress, amount, spender);
    }
  }

  /**
   * Gets the current ETH price in USDC
   * @param wallet Connected wallet to query the price
   * @returns ETH price in USDC as a string
   */
  async getEthUsdcPrice(wallet: Wallet): Promise<string> {
    await validateNetwork(wallet, this.chain);

    const tokenIn = ethers.ZeroAddress;
    const tokenOut = this.USDC_ADDRESS;
    const fee = FeeAmount.LOW;
    const tickSpacing = FeeToTickSpacing.get(fee)!;

    const poolKey: PoolKey = {
      currency0: tokenIn,
      currency1: tokenOut,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: ethers.ZeroAddress,
    };
    const zeroForOne = true;
    const exactAmount = ethers.parseEther("1");
    const hookData = ethers.ZeroAddress;

    const { amountOut, gasEstimate } = await this.quoter.quoteExactInputSingle(
      wallet,
      poolKey,
      zeroForOne,
      exactAmount,
      hookData,
    );

    const formattedAmountOut = ethers.formatUnits(amountOut, this.USDC_DECIMALS);

    return formattedAmountOut;
  }
  async getBuyTradeQuote(wallet: Wallet, trade: BuyTradeCreationDto): Promise<TradeQuote> {
    throw new Error("Not implemented");
  }
  async getSellTradeQuote(wallet: Wallet, trade: SellTradeCreationDto): Promise<TradeQuote> {
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
