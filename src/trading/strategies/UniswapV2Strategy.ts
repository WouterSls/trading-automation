import { TransactionRequest, Wallet, ethers } from "ethers";

import { ChainType, getChainConfig } from "../../config/chain-config";
import { TRADING_CONFIG } from "../../config/trading-config";

import { ERC20, createMinimalErc20 } from "../../smartcontracts/ERC/_index";
import { UniswapV2RouterV2 } from "../../smartcontracts/uniswap-v2/index";

import { ITradingStrategy } from "../ITradingStrategy";
import { InputType, Quote, TradeType } from "../types/_index";

import {
  calculatePriceImpact,
  calculateSlippageAmount,
  determineTradeType,
  ensureInfiniteApproval,
  ensureStandardApproval,
  validateNetwork,
} from "../../lib/_index";
import { RouteOptimizer } from "../../routing/RouteOptimizer";
import { TradeCreationDto } from "../types/dto/TradeCreationDto";

export class UniswapV2Strategy implements ITradingStrategy {
  private router: UniswapV2RouterV2;

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

    this.router = new UniswapV2RouterV2(chain);

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
  async ensureTokenApproval(wallet: Wallet, tokenAddress: string, amount: string): Promise<string | null> {
    await validateNetwork(wallet, this.chain);

    if (tokenAddress === ethers.ZeroAddress) return null;

    const spender = this.router.getRouterAddress();

    if (TRADING_CONFIG.INFINITE_APPROVAL) {
      return await ensureInfiniteApproval(wallet, tokenAddress, amount, spender);
    } else {
      return await ensureStandardApproval(wallet, tokenAddress, amount, spender);
    }
  }

  /**
   * Gets the current ETH price in USDC through hardcoded path
   * @param wallet Connected wallet to query the price
   * @returns ETH price in USDC as a string
   */
  async getEthUsdcPrice(wallet: Wallet): Promise<string> {
    await validateNetwork(wallet, this.chain);

    const tradePath = [this.WETH_ADDRESS, this.USDC_ADDRESS];
    const inputAmount = ethers.parseUnits("1", this.WETH_DECIMALS);

    const amountsOut = await this.router.getAmountsOut(wallet, inputAmount, tradePath);
    const amountOut = amountsOut[amountsOut.length - 1];
    const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);
    return amountFormatted;
  }

  /**
   * Gets a comprehensive quote for a trade by calling on chain quoting functions
   *
   * @param trade trade creation parameters
   * @param wallet Connected wallet to query the price
   * @returns TradeQuote with all execution details
   */
  async getQuote(trade: TradeCreationDto, wallet: Wallet): Promise<Quote> {
    await validateNetwork(wallet, this.chain);

    const inputToken: ERC20 | null = await createMinimalErc20(trade.inputToken, wallet.provider!);
    const outputToken: ERC20 | null = await createMinimalErc20(trade.outputToken, wallet.provider!);

    let quote: Quote = {
      outputAmount: "0",
      route: {
        amountOut: 0n,
        path: [],
        fees: [],
        encodedPath: null,
        poolKey: null,
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

    quote.route = await this.routeOptimizer.getBestUniV2Route(trade.inputToken, amountIn, trade.outputToken, wallet);

    quote.outputAmount = ethers.formatUnits(quote.route.amountOut, outputDecimals);

    return quote;
  }

  /**
   * Creates a transaction based on the provided trade parameters
   * Includes price impact validation and slippage protection
   * @param trade trade creation parameters
   * @param wallet Connected wallet to create transaction for
   * @returns Transaction request object ready to be sent
   * @throws Error if price impact exceeds maximum allowed percentage
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

    const route = await this.routeOptimizer.getBestUniV2Route(trade.inputToken, amountIn, trade.outputToken, wallet);

    console.log("Amount in for spot rate:");
    console.log(amountInForSpotRate);
    console.log("");

    const amountsOut = await this.router.getAmountsOut(wallet, amountInForSpotRate, route.path);
    console.log("amounts out");
    console.log(amountsOut);
    const expectedOutput = amountsOut[amountsOut.length - 1];
    const actualOutput = route.amountOut;

    console.log("Expected output:");
    console.log(expectedOutput);
    console.log();
    console.log("Actual output:");
    console.log(actualOutput);

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
        tx = await this.router.createSwapExactETHForTokensTransaction(amountOutMin, route.path, to, deadline);
        tx.value = amountIn;
        break;
      case TradeType.TOKENInputETHOutput:
        tx = this.router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, route.path, to, deadline);
        break;
      case TradeType.TOKENInputTOKENOutput:
        tx = this.router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, route.path, to, deadline);
        break;
      default:
        throw new Error("Unknown trade type");
    }

    return tx;
  }
}
