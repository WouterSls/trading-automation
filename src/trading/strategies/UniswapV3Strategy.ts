import { ethers, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";

import { UniswapV3QuoterV2 } from "../../smartcontracts/uniswap-v3/UniswapV3QuoterV2";
import { UniswapV3SwapRouterV2 } from "../../smartcontracts/uniswap-v3/UniswapV3SwapRouterV2";

import { ITradingStrategy } from "../ITradingStrategy";
import { FeeAmount } from "../../smartcontracts/uniswap-v3/uniswap-v3-types";
import { InputType, Quote, Route, TradeCreationDto, TradeType } from "../types/_index";
import { validateNetwork } from "../../lib/utils";
import { calculatePriceImpact, calculateSlippageAmount, determineTradeType } from "../trading-utils";
import { TRADING_CONFIG } from "../../config/trading-config";
import { ensureInfiniteApproval, ensureStandardApproval } from "../../lib/approval-strategies";
import { createMinimalErc20 } from "../../smartcontracts/ERC/erc-utils";
import { RouteOptimizer } from "../../routing/RouteOptimizer";
import { Permit2 } from "../../smartcontracts/permit2/Permit2";
import { ERC20 } from "../../smartcontracts/ERC/ERC20";
import { CreateTransactionError, QuoteError } from "../../lib/errors";

/**
 * Uniswap V3 trading strategy implementation
 *
 * This strategy implements the ITradingStrategy interface for Uniswap V3 protocol,
 * providing functionality for token swaps, quote generation, and transaction creation.
 * It supports ETH-to-token, token-to-ETH, and token-to-token swaps with price impact
 * protection and slippage control.
 *
 * Features:
 * - Multi-hop routing optimization
 * - Price impact calculation and validation
 * - Slippage protection
 * - Token approval management
 * - Support for both single and multi-hop swaps
 *
 * @implements {ITradingStrategy}
 */
export class UniswapV3Strategy implements ITradingStrategy {
  private readonly strategyName = "UniswapV3";

  private quoter: UniswapV3QuoterV2;
  private router: UniswapV3SwapRouterV2;

  private routeOptimizer: RouteOptimizer;

  private WETH_ADDRESS: string;
  private USDC_ADDRESS: string;

  private USDC_DECIMALS = 6;

  /**
   * Creates a new UniswapV3Strategy instance
   *
   * Initializes the strategy with the specified chain configuration and sets up
   * the necessary smart contract instances for quoter, router, and permit2.
   * Also configures the route optimizer for finding optimal swap paths.
   *
   * @param chain - The blockchain network this strategy will operate on
   */
  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.USDC_ADDRESS = chainConfig.tokenAddresses.usdc;

    this.quoter = new UniswapV3QuoterV2(chain);
    this.router = new UniswapV3SwapRouterV2(chain);

    this.routeOptimizer = new RouteOptimizer(chain);
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
  async ensureTokenApproval(tokenAddress: string, amount: string, wallet: Wallet): Promise<string | null> {
    await validateNetwork(wallet, this.chain);
    const spender = this.router.getRouterAddress();
    if (TRADING_CONFIG.INFINITE_APPROVAL) {
      return await ensureInfiniteApproval(tokenAddress, amount, spender, wallet);
    } else {
      return await ensureStandardApproval(tokenAddress, amount, spender, wallet);
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
   * Gets a quote for a potential trade
   *
   * Calculates the expected output amount for a given trade without executing it.
   * This method determines the trade type, calculates the appropriate input amount,
   * finds the optimal route, and returns a quote with the expected output.
   *
   * @param trade - The trade configuration containing input/output tokens and amounts
   * @param wallet - Connected wallet to use for the quote calculation
   * @returns A quote object containing the expected output amount and route information
   * @throws Error if the trade type is unsupported or tokens are invalid
   */
  async getQuote(trade: TradeCreationDto, wallet: Wallet): Promise<Quote> {
    await validateNetwork(wallet, this.chain);

    const inputToken: ERC20 | null = await createMinimalErc20(trade.inputToken, wallet.provider!);
    const outputToken: ERC20 | null = await createMinimalErc20(trade.outputToken, wallet.provider!);

    let quote: Quote = {
      strategy: this.strategyName,
      outputAmount: "0",
      route: {
        amountOut: 0n,
        path: [],
        fees: [],
        encodedPath: null,
        poolKey: null,
        pathSegments: null,
        aeroRoutes: null,
      },
    };

    const tradeType: TradeType = determineTradeType(trade);

    let amountIn;
    switch (tradeType) {
      case TradeType.ETHInputTOKENOutput:
        if (trade.inputType === InputType.USD) {
          const ethUsdcPrice = await this.getEthUsdcPrice(wallet);
          const ethValue = parseFloat(trade.inputAmount) / parseFloat(ethUsdcPrice);
          const ethValueFixed = ethValue.toFixed(18);
          amountIn = ethers.parseEther(ethValueFixed);
        } else {
          amountIn = ethers.parseEther(trade.inputAmount);
        }
        break;
      case TradeType.TOKENInputETHOutput:
      case TradeType.TOKENInputTOKENOutput:
        if (!inputToken) throw new QuoteError("Invalid input token for trade with token input");
        trade.inputAmount === "0"
          ? (amountIn = BigInt(await inputToken.getRawTokenBalance(wallet.address)))
          : (amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals()));
        break;
      default:
        throw new QuoteError("Unknown trade type");
    }

    let outputDecimals;
    switch (tradeType) {
      case TradeType.TOKENInputETHOutput:
        outputDecimals = 18;
        break;
      case TradeType.ETHInputTOKENOutput:
      case TradeType.TOKENInputTOKENOutput:
        if (!outputToken) throw new QuoteError("Invalid output token for trade with token output");
        outputDecimals = outputToken.getDecimals();
        break;
      default:
        throw new QuoteError("Unknown trade type");
    }

    quote.route = await this.routeOptimizer.getBestUniV3Route(trade.inputToken, amountIn, trade.outputToken, wallet);

    quote.outputAmount = ethers.formatUnits(quote.route.amountOut, outputDecimals);

    return quote;
  }

  /**
   * Creates a transaction for executing a trade
   *
   * Builds a complete transaction object that can be submitted to execute the specified trade.
   * This method handles price impact validation, slippage protection, and creates the appropriate
   * transaction based on the trade type (single-hop vs multi-hop, ETH vs token trades).
   *
   * @param trade - The trade configuration containing input/output tokens and amounts
   * @param wallet - Connected wallet that will execute the transaction
   * @returns A transaction request object ready for execution
   * @throws Error if price impact exceeds configured limits or route generation fails
   */
  async createTransaction(trade: TradeCreationDto, wallet: Wallet): Promise<TransactionRequest> {
    await validateNetwork(wallet, this.chain);

    let tx: TransactionRequest = {};

    const to = wallet.address;
    const deadline = TRADING_CONFIG.DEADLINE;

    const tradeType: TradeType = determineTradeType(trade);

    const inputToken = await createMinimalErc20(trade.inputToken, wallet.provider!);
    const outputToken = await createMinimalErc20(trade.outputToken, wallet.provider!);

    let amountIn;
    let amountInForSpotRate;
    switch (tradeType) {
      case TradeType.ETHInputTOKENOutput:
        if (trade.inputType === InputType.USD) {
          const ethUsdcPrice = await this.getEthUsdcPrice(wallet);
          const ethValue = parseFloat(trade.inputAmount) / parseFloat(ethUsdcPrice);
          const ethValueFixed = ethValue.toFixed(18);
          amountIn = ethers.parseEther(ethValueFixed);
        } else {
          amountIn = ethers.parseEther(trade.inputAmount);
        }
        amountInForSpotRate = ethers.parseEther(TRADING_CONFIG.PRICE_IMPACT_AMOUNT_IN);
        break;
      case TradeType.TOKENInputETHOutput:
      case TradeType.TOKENInputTOKENOutput:
        if (!inputToken) throw new CreateTransactionError("Invalid input token for trade with token input");
        console.log("TOTAL AMOUNT:");
        console.log(inputToken);
        console.log();

        trade.inputAmount === "0"
          ? (amountIn = BigInt(await inputToken.getRawTokenBalance(wallet.address)))
          : (amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals()));
        //amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());
        amountInForSpotRate = ethers.parseUnits(TRADING_CONFIG.PRICE_IMPACT_AMOUNT_IN, inputToken.getDecimals());
        break;
      default:
        throw new CreateTransactionError("Unknown trade type");
    }

    console.log("AMOUNT IN TRADE");
    console.log(amountIn);

    switch (tradeType) {
      case TradeType.ETHInputTOKENOutput:
      case TradeType.TOKENInputTOKENOutput:
        if (!outputToken) throw new CreateTransactionError("Invalid output token for trade with token output");
        break;
    }

    const route = await this.routeOptimizer.getBestUniV3Route(trade.inputToken, amountIn, trade.outputToken, wallet);
    if (!route.encodedPath && !route.path) {
      throw new CreateTransactionError("Error during best Uniswap V3 route generation");
    }

    const expectedOutput = await this.calculateExpectedOutput(amountInForSpotRate, amountIn, route, wallet);
    const actualOutput = route.amountOut;

    const priceImpact = calculatePriceImpact(expectedOutput, actualOutput);
    if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
      throw new CreateTransactionError(
        `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
      );
    }

    const slippageAmount = calculateSlippageAmount(actualOutput);
    const amountOutMin = actualOutput - slippageAmount;

    const sqrtPriceLimitX96 = 0n;

    const isMultihop = route.path.length > 2 && route.encodedPath;

    switch (tradeType) {
      case TradeType.ETHInputTOKENOutput:
      case TradeType.TOKENInputTOKENOutput:
        if (isMultihop) {
          tx = this.router.createExactInputTransaction(route.encodedPath!, to, amountIn, amountOutMin);
        } else {
          tx = this.router.createExactInputSingleTransaction(
            route.path[0],
            route.path[1],
            route.fees[0],
            to,
            amountIn,
            amountOutMin,
            sqrtPriceLimitX96,
          );
        }

        if (tradeType === TradeType.ETHInputTOKENOutput) {
          tx.value = amountIn;
        }
        break;
      case TradeType.TOKENInputETHOutput:
        let swapData;
        if (isMultihop) {
          swapData = this.router.encodeExactInput(route.encodedPath!, to, amountIn, amountOutMin);
        } else {
          swapData = this.router.encodeExactInputSingle(
            route.path[0],
            route.path[1],
            route.fees[0],
            this.router.getRouterAddress(),
            amountIn,
            amountOutMin,
            sqrtPriceLimitX96,
          );
        }
        const unwrapWethData = this.router.encodeUnwrapWETH9(amountOutMin, to);
        tx = await this.router.createMulticallTransaction(deadline, [swapData, unwrapWethData]);
        break;
      default:
        throw new CreateTransactionError("Unknown trade type");
    }

    return tx;
  }

  /**
   * Calculates expected output for price impact calculation using multiple fallback spot rates
   *
   * This method attempts to get an accurate spot rate by trying multiple smaller amounts
   * if the configured spot rate amount fails or returns zero. It uses a fallback mechanism
   * with progressively larger amounts (1%, 2%, 5% of trade amount) to ensure accurate
   * price impact calculations even for large trades or low-liquidity pools.
   *
   * @param amountInForSpotRate - Original configured spot rate amount
   * @param amountIn - Actual trade amount
   * @param route - Trading route information including path and fees
   * @param wallet - Connected wallet for making the quote calls
   * @returns Expected output amount scaled to actual trade size
   * @private
   */
  private async calculateExpectedOutput(
    amountInForSpotRate: bigint,
    amountIn: bigint,
    route: Route,
    wallet: Wallet,
  ): Promise<bigint> {
    const spotRateAmounts = [
      amountInForSpotRate, // Original configured amount
      amountIn / 100n, // 1% of trade amount
      amountIn / 50n, // 2% of trade amount
      amountIn / 20n, // 5% of trade amount
    ];

    const recipient = ethers.ZeroAddress;
    const amountOutMin = 0n;
    const sqrtPriceLimitX96 = 0n;

    const isMultihop = route.path.length > 2 && route.encodedPath;

    for (const spotAmount of spotRateAmounts) {
      if (spotAmount > 0n) {
        try {
          let spotOutput;
          if (isMultihop) {
            const { amountOut } = await this.quoter.quoteExactInput(wallet, route.encodedPath!, spotAmount);
            spotOutput = amountOut;
          } else {
            const { amountOut } = await this.quoter.quoteExactInputSingle(
              wallet,
              route.path[0],
              route.path[1],
              route.fees[0],
              recipient,
              spotAmount,
              amountOutMin,
              sqrtPriceLimitX96,
            );
            spotOutput = amountOut;
          }

          if (spotOutput > 0n) {
            return (spotOutput * amountIn) / spotAmount;
          }
        } catch (error) {
          continue;
        }
      }
    }

    return 0n;
  }
}
