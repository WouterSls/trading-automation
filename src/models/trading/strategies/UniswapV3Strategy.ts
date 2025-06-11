import { ethers, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";

import { UniswapV3QuoterV2 } from "../../smartcontracts/uniswap-v3/UniswapV3QuoterV2";
import { UniswapV3Factory } from "../../smartcontracts/uniswap-v3/UniswapV3Factory";
import { UniswapV3SwapRouterV2 } from "../../smartcontracts/uniswap-v3/UniswapV3SwapRouterV2";

import { ITradingStrategy } from "../ITradingStrategy";
import { FeeAmount } from "../../smartcontracts/uniswap-v3/uniswap-v3-types";
import { BuyTradeCreationDto, InputType, SellTradeCreationDto, Quote, Route } from "../types/_index";
import { validateNetwork } from "../../../lib/utils";
import { TRADING_CONFIG } from "../../../config/trading-config";
import { ensureInfiniteApproval, ensureStandardApproval } from "../../../lib/approval-strategies";
import { createMinimalErc20 } from "../../smartcontracts/ERC/erc-utils";
import { RouteOptimizer } from "../RouteOptimizer";

export class UniswapV3Strategy implements ITradingStrategy {
  private quoter: UniswapV3QuoterV2;
  private factory: UniswapV3Factory;
  private router: UniswapV3SwapRouterV2;

  private routeOptimizer: RouteOptimizer;

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

    this.routeOptimizer = new RouteOptimizer(chain);
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
   * Gets a comprehensive quote for a buy trade by mirroring the exact transaction creation logic
   * @param wallet Connected wallet to query the price
   * @param trade Buy trade creation parameters
   * @returns Token price in USDC as a string
   */
  async getBuyTradeQuote(wallet: Wallet, trade: BuyTradeCreationDto): Promise<Quote> {
    await validateNetwork(wallet, this.chain);

    const outputToken = await createMinimalErc20(trade.outputToken, wallet.provider!);

    let outputAmount = "0";
    let priceImpact = 0;
    let route: Route = {
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
    };

    const isETHInputETHAmount = trade.inputType === InputType.ETH && trade.inputToken === ethers.ZeroAddress;
    const isETHInputUSDAmount = trade.inputType === InputType.USD && trade.inputToken === ethers.ZeroAddress;
    const isTOKENInputTOKENAmount = trade.inputType === InputType.TOKEN && trade.inputToken !== ethers.ZeroAddress;

    if (isETHInputETHAmount) {
      const recipient = wallet.address;
      const amountIn = ethers.parseEther(trade.inputAmount);
      const amountOutMin = 0n;
      const sqrtPriceLimitX96 = 0n;

      route = await this.routeOptimizer.uniV3GetOptimizedRoute(this.WETH_ADDRESS, outputToken.getTokenAddress());

      const isMultiHop = route.path.length > 2 && route.encodedPath;
      const isSingleHop = route.path.length === 2 && route.encodedPath;

      if (isMultiHop) {
        //quoteExactInput
      }

      if (isSingleHop) {
        //quoteExactInputSingle
        const { amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate } =
          await this.quoter.quoteExactInputSingle(
            wallet,
            route.path[0],
            route.path[1],
            route.fees[0],
            recipient,
            amountIn,
            amountOutMin,
            sqrtPriceLimitX96,
          );

        outputAmount = ethers.formatUnits(amountOut, outputToken.getDecimals());
      }
    }

    if (isETHInputUSDAmount) {
    }

    if (isTOKENInputTOKENAmount) {
    }

    return {
      outputAmount,
      priceImpact,
      route,
    };
  }

  /**
   * Gets a comprehensive quote for a sell trade by mirroring the exact transaction creation logic
   * @param wallet Connected wallet to query the price
   * @param trade Sell trade creation parameters
   * @returns Token price in USDC as a string
   */
  async getSellTradeQuote(wallet: Wallet, trade: SellTradeCreationDto): Promise<Quote> {
    throw new Error("Not implemented");
  }

  /**
   * Creates a buy transaction based on the provided trade parameters
   * @param wallet Connected wallet to create transaction for
   * @param trade Buy trade creation parameters
   * @returns Transaction request object ready to be sent
   */
  async createBuyTransaction(wallet: Wallet, trade: BuyTradeCreationDto): Promise<TransactionRequest> {
    await validateNetwork(wallet, this.chain);

    const outputToken = await createMinimalErc20(trade.outputToken, wallet.provider!);

    const recipient = wallet.address;
    const deadline = TRADING_CONFIG.DEADLINE;

    let tx: TransactionRequest = {};

    const isETHInputETHAmount = trade.inputType === InputType.ETH && trade.inputToken === ethers.ZeroAddress;
    const isETHInputUSDAmount = trade.inputType === InputType.USD && trade.inputToken === ethers.ZeroAddress;
    const isTOKENInputTOKENAmount = trade.inputType === InputType.TOKEN && trade.inputToken !== ethers.ZeroAddress;

    if (isETHInputETHAmount) {
      // TODO: find best pool/pools for trade
      const recipient = wallet.address;
      const amountIn = ethers.parseEther(trade.inputAmount);
      let amountOutMin = 0n;
      const sqrtPriceLimitX96 = 0n;

      const route = await this.routeOptimizer.uniV3GetOptimizedRoute(this.WETH_ADDRESS, outputToken.getTokenAddress());

      const wrapData = this.router.encodeWrapETH(amountIn);

      const isMultiHop = route.path.length > 2 && route.encodedPath;
      const isSingleHop = route.path.length === 2 && route.encodedPath;

      if (isSingleHop) {
        const { amountOut, gasEstimate } = await this.quoter.quoteExactInputSingle(
          wallet,
          route.path[0],
          route.path[1],
          route.fees[0],
          recipient,
          amountIn,
          amountOutMin,
          sqrtPriceLimitX96,
        );
        amountOutMin = (amountOut * 95n) / 100n;

        const swapData = this.router.encodeExactInputSingle(
          route.path[0],
          route.path[1],
          route.fees[0],
          recipient,
          amountIn,
          amountOutMin,
          sqrtPriceLimitX96,
        );

        tx = this.router.createMulticallTransaction(deadline, [wrapData, swapData]);

        //tx.data = wrapData;
        //tx.to = this.router.getRouterAddress();

        tx.value = amountIn;
      }

      if (isMultiHop) {
        const { amountOut } = await this.quoter.quoteExactInput(wallet, route.encodedPath!, amountIn);
        amountOutMin = (amountOut * 95n) / 100n;

        const swapData = this.router.encodeExactInput(route.encodedPath!, recipient, amountIn, amountOutMin);

        tx = this.router.createMulticallTransaction(deadline, [wrapData, swapData]);
      }
    }

    if (isETHInputUSDAmount) {
    }

    if (isTOKENInputTOKENAmount) {
    }

    return tx;
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
