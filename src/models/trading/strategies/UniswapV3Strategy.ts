import { ethers, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";

import { UniswapV3QuoterV2 } from "../../blockchain/uniswap-v3/UniswapV3QuoterV2";
import { UniswapV3Factory } from "../../blockchain/uniswap-v3/UniswapV3Factory";
import { UniswapV3SwapRouterV2 } from "../../blockchain/uniswap-v3/UniswapV3SwapRouterV2";

import { ITradingStrategy } from "../ITradingStrategy";
import { ERC20_INTERFACE } from "../../../lib/contract-abis/erc20";
import { FeeAmount } from "../../blockchain/uniswap-v3/uniswap-v3-types";
import { BuyTradeCreationDto, SellTradeCreationDto, TradeQuote } from "../types/_index";
import { validateNetwork } from "../../../lib/utils";
import { TRADING_CONFIG } from "../../../config/trading-config";
import { ensureInfiniteApproval, ensureStandardApproval } from "../../../lib/approval-strategies";
import { encodePath } from "../../blockchain/uniswap-v3";

export class UniswapV3Strategy implements ITradingStrategy {
  private quoter: UniswapV3QuoterV2;
  private factory: UniswapV3Factory;
  private router: UniswapV3SwapRouterV2;

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

    this.quoter = new UniswapV3QuoterV2(chain);
    this.factory = new UniswapV3Factory(chain);
    this.router = new UniswapV3SwapRouterV2(chain);
  }

  /**
   * Gets the name of this trading strategy
   * @returns The strategy name
   */
  getName = (): string => this.strategyName;

  // TODO: uniswap v3 supports permit 2?
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

    const tokenIn = this.WETH_ADDRESS;
    const tokenOut = this.USDC_ADDRESS;
    const fee = FeeAmount.LOW;
    const recipient = wallet.address;
    const amountIn = ethers.parseEther("1");
    const amountOutMin = 0n;
    const sqrtPriceLimitX96 = 0n;

    const { amountOut } = await this.quoter.quoteExactInputSingle(
      wallet,
      tokenIn,
      tokenOut,
      fee,
      recipient,
      amountIn,
      amountOutMin,
      sqrtPriceLimitX96,
    );

    const formattedAmountOut = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);
    return formattedAmountOut.toString();
  }

  /**
   * Gets the WETH liquidity for a given token pair (can be used to get ETH liquidity)
   * @param wallet Connected wallet to query liquidity
   * @param tokenAddress Address of the token to check liquidity for
   * @returns WETH liquidity amount as a string
   */
  async getTokenWethLiquidity(wallet: Wallet, tokenAddress: string): Promise<string> {
    try {
      const feeTiers = [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];

      let bestLiquidity = "";
      let bestPoolAddress = "";

      for (const feeTier of feeTiers) {
        const poolAddress = await this.factory.getPoolAddress(wallet, tokenAddress, this.WETH_ADDRESS, feeTier);
        if (!poolAddress || poolAddress === ethers.ZeroAddress) continue;

        const encodedData = ERC20_INTERFACE.encodeFunctionData("balanceOf", [poolAddress]);

        const tx: TransactionRequest = {
          to: this.WETH_ADDRESS,
          data: encodedData,
        };

        const ethLiquidity = await wallet.call(tx);
        const ethLiquidityFormatted = ethers.formatEther(ethLiquidity);

        console.log("fee:", feeTier);
        console.log("pool address:", poolAddress);
        console.log("pool weth balance: ", ethLiquidityFormatted);

        if (ethLiquidity > bestLiquidity) {
          bestLiquidity = ethLiquidityFormatted;
          bestPoolAddress = poolAddress;
          console.log("new best liquidity:", bestLiquidity);
        }
      }

      const ethLiquidityFormatted = ethers.formatEther(parseFloat(bestLiquidity));
      return ethLiquidityFormatted;
    } catch (error) {
      console.error(
        `Error checking V3 liquidity for ${tokenAddress}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return "0";
    }
  }

  /**
   * Gets the current token price in USDC by using WETH as intermediary trade token
   * @param wallet Connected wallet to query the price
   * @param tokenAddress Address of the token to get price for
   * @returns Token price in USDC as a string
   */
  async getTokenUsdcPrice(wallet: Wallet, tokenAddress: string): Promise<string> {
    const VIRTUAL_ADDRESS = "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b";
    const path = [tokenAddress, this.WETH_ADDRESS, this.USDC_ADDRESS];
    const fees = [FeeAmount.MEDIUM, FeeAmount.MEDIUM];
    const encodedPath = encodePath(path, fees);
    const amountIn = ethers.parseUnits("1", 18);

    const { amountOut } = await this.quoter.quoteExactInput(wallet, encodedPath, amountIn);
    const amountOutFormatted = ethers.formatUnits(amountOut, this.USDC_DECIMALS);
    return amountOutFormatted;
  }

  /**
   * Gets a comprehensive quote for a buy trade by mirroring the exact transaction creation logic
   * @param wallet Connected wallet to query the price
   * @param trade Buy trade creation parameters
   * @returns Token price in USDC as a string
   */
  async getBuyTradeQuote(wallet: Wallet, trade: BuyTradeCreationDto): Promise<TradeQuote> {
    throw new Error("Not implemented");
  }

  /**
   * Gets a comprehensive quote for a sell trade by mirroring the exact transaction creation logic
   * @param wallet Connected wallet to query the price
   * @param trade Sell trade creation parameters
   * @returns Token price in USDC as a string
   */
  async getSellTradeQuote(wallet: Wallet, trade: SellTradeCreationDto): Promise<TradeQuote> {
    throw new Error("Not implemented");
  }

  /**
   * Creates a buy transaction based on the provided trade parameters
   * @param wallet Connected wallet to create transaction for
   * @param trade Buy trade creation parameters
   * @returns Transaction request object ready to be sent
   */
  async createBuyTransaction(wallet: Wallet, trade: BuyTradeCreationDto): Promise<TransactionRequest> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }

  /**
   * Creates a sell transaction based on the provided trade parameters
   * Includes price impact validation and slippage protection
   * @param wallet Connected wallet to create transaction for
   * @param trade Sell trade creation parameters
   * @returns Transaction request object ready to be sent
   * @throws Error if price impact exceeds maximum allowed percentage
   */
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
