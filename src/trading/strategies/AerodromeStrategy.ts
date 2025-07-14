import { TransactionRequest, Wallet, ethers } from "ethers";

import { ChainType, getChainConfig } from "../../config/chain-config";
import { TRADING_CONFIG } from "../../config/trading-config";

import { ERC20, createMinimalErc20 } from "../../smartcontracts/ERC/_index";
import { AerodromeRouter } from "../../smartcontracts/aerodrome/AerodromeRouter";
import { AerodromePoolFactory } from "../../smartcontracts/aerodrome/AerodromePoolFactory";
import { AerodromeTradeRoute } from "../../smartcontracts/aerodrome/aerodrome-types";

import { ITradingStrategy } from "../ITradingStrategy";
import { InputType, Quote, TradeCreationDto, TradeType } from "../types/_index";

import { ensureInfiniteApproval, ensureStandardApproval, validateNetwork } from "../../lib/_index";
import { calculatePriceImpact, calculateSlippageAmount, determineTradeType } from "../trading-utils";
import { RouteOptimizer } from "../../routing/RouteOptimizer";

/**
 * Aerodrome trading strategy implementation
 *
 * This strategy implements the ITradingStrategy interface for Aerodrome protocol,
 * providing functionality for token swaps, quote generation, and transaction creation.
 * Aerodrome is a fork of Velodrome V2 and is specifically designed for Base chain.
 *
 * Key features of Aerodrome:
 * - Supports both stable and volatile pools
 * - Optimized for Base chain ecosystem
 * - Lower fees compared to other AMMs
 * - Efficient routing through multiple pool types
 * - Bribes and voting mechanisms for liquidity incentives
 *
 * Features:
 * - Multi-hop routing optimization
 * - Price impact calculation and validation
 * - Slippage protection
 * - Token approval management
 * - Support for stable and volatile pair swaps
 * - Base chain specific optimizations
 *
 * @implements {ITradingStrategy}
 */
export class AerodromeStrategy implements ITradingStrategy {
  private router: AerodromeRouter;
  private factory: AerodromePoolFactory;

  private routeOptimizer: RouteOptimizer;

  private WETH_ADDRESS: string;
  private USDC_ADDRESS: string;

  private WETH_DECIMALS = 18;
  private USDC_DECIMALS = 6;

  /**
   * Creates a new AerodromeStrategy instance
   *
   * Initializes the strategy with the specified chain configuration and sets up
   * the necessary smart contract instances for router and factory operations.
   * This strategy is specifically designed for Base chain and will throw an error
   * if used on other chains.
   *
   * @param strategyName - Human-readable name for this strategy instance
   * @param chain - The blockchain network this strategy will operate on (must be Base)
   * @throws Error if the chain is not Base, as Aerodrome only supports Base chain
   */
  constructor(
    private strategyName: string,
    private chain: ChainType,
  ) {
    if (chain !== ChainType.BASE) {
      throw new Error("AerodromeStrategy is only supported on Base chain");
    }

    const chainConfig = getChainConfig(chain);

    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.USDC_ADDRESS = chainConfig.tokenAddresses.usdc;

    this.router = new AerodromeRouter(chain);
    this.factory = new AerodromePoolFactory(chain);

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
   * @param amount Amount to approve (threshold validation or standard approval calculation)
   * @returns gas cost of if needed, null if already approved
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

    const routes: AerodromeTradeRoute[] = [
      {
        from: this.WETH_ADDRESS,
        to: this.USDC_ADDRESS,
        stable: false,
        factory: this.factory.getFactoryAddress(),
      },
    ];

    const inputAmount = ethers.parseUnits("1", this.WETH_DECIMALS);
    const amountOut = await this.router.getAmountsOut(wallet, inputAmount, routes);
    const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);
    return amountFormatted;
  }

  /**
   * Gets a quote for a potential trade
   *
   * Calculates the expected output amount for a given trade without executing it.
   * This method determines the trade type, calculates the appropriate input amount,
   * finds the optimal route through Aerodrome pools (considering both stable and volatile pools),
   * and returns a quote with the expected output amount.
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
        if (!inputToken) throw new Error("Invalid input token for trade with token input");
        amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());
        break;
      default:
        throw new Error("Unknown trade type");
    }

    let outputDecimals;
    switch (tradeType) {
      case TradeType.TOKENInputETHOutput:
        outputDecimals = 18;
        break;
      case TradeType.ETHInputTOKENOutput:
      case TradeType.TOKENInputTOKENOutput:
        if (!outputToken) throw new Error("Invalid output token for trade with token output");
        outputDecimals = outputToken.getDecimals();
        break;
      default:
        throw new Error("Unknown trade type");
    }

    quote.route = await this.routeOptimizer.getBestAeroRoute(trade.inputToken, amountIn, trade.outputToken, wallet);

    quote.outputAmount = ethers.formatUnits(quote.route.amountOut, outputDecimals);

    return quote;
  }

  /**
   * Creates a transaction for executing a trade
   *
   * Builds a complete transaction object that can be submitted to execute the specified trade.
   * This method handles price impact validation, slippage protection, and creates the appropriate
   * transaction based on the trade type. It uses Aerodrome's routing system to find the optimal
   * path through available pools.
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
        if (!inputToken) throw new Error("Invalid input token for trade with token input");
        amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());
        amountInForSpotRate = ethers.parseUnits(TRADING_CONFIG.PRICE_IMPACT_AMOUNT_IN, inputToken.getDecimals());
        break;
      default:
        throw new Error("Unknown trade type");
    }

    switch (tradeType) {
      case TradeType.ETHInputTOKENOutput:
      case TradeType.TOKENInputTOKENOutput:
        if (!outputToken) throw new Error("Invalid output token for trade with token output");
        break;
    }

    const route = await this.routeOptimizer.getBestAeroRoute(trade.inputToken, amountIn, trade.outputToken, wallet);
    if (!route.aeroRoutes) throw new Error("Error during Aerodrome route generation");

    const expectedOutput = await this.calculateExpectedOutput(amountInForSpotRate, amountIn, route.aeroRoutes, wallet);
    const actualOutput = route.amountOut;

    const priceImpact = calculatePriceImpact(expectedOutput, actualOutput);
    if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
      throw new Error(
        `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
      );
    }

    const slippageAmount = calculateSlippageAmount(actualOutput);
    const amountOutMin = actualOutput - slippageAmount;

    switch (tradeType) {
      case TradeType.ETHInputTOKENOutput:
        tx = await this.router.createSwapExactETHForTokensTransaction(amountOutMin, route.aeroRoutes, to, deadline);
        tx.value = amountIn;
        break;
      case TradeType.TOKENInputETHOutput:
        tx = this.router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, route.aeroRoutes, to, deadline);
        break;
      case TradeType.TOKENInputTOKENOutput:
        tx = this.router.createSwapExactTokensForTokensTransaction(
          amountIn,
          amountOutMin,
          route.aeroRoutes,
          to,
          deadline,
        );
        break;
      default:
        throw new Error("Unknown trade type");
    }

    return tx;
  }

  /**
   * Calculates expected output for price impact calculation using multiple fallback spot rates
   *
   * @param amountInForSpotRate Original configured spot rate amount
   * @param amountIn Actual trade amount
   * @param path Trading path
   * @param wallet Connected wallet
   * @returns Expected output amount scaled to actual trade size
   */
  private async calculateExpectedOutput(
    amountInForSpotRate: bigint,
    amountIn: bigint,
    aeroRoutes: AerodromeTradeRoute[],
    wallet: Wallet,
  ): Promise<bigint> {
    const spotRateAmounts = [
      amountInForSpotRate, // Original configured amount
      amountIn / 100n, // 1% of trade amount
      amountIn / 50n, // 2% of trade amount
      amountIn / 20n, // 5% of trade amount
    ];

    for (const spotAmount of spotRateAmounts) {
      if (spotAmount > 0n) {
        try {
          const amountsOut = await this.router.getAmountsOut(wallet, spotAmount, aeroRoutes);
          const spotOutput = amountsOut[amountsOut.length - 1];

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
