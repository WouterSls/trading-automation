import { TransactionRequest, Wallet, ethers } from "ethers";

import { ChainType, getChainConfig } from "../../../config/chain-config";
import { TRADING_CONFIG } from "../../../config/trading-config";

import { ERC20, createMinimalErc20 } from "../../smartcontracts/ERC/_index";
import { UniswapV2RouterV2, UniswapV2Factory } from "../../smartcontracts/uniswap-v2/index";

import { ITradingStrategy } from "../ITradingStrategy";
import {
  BuyTradeCreationDto,
  SellTradeCreationDto,
  InputType,
  Quote,
  OutputType,
  Route,
  TradeType,
} from "../types/_index";

import { ERC20_INTERFACE } from "../../../lib/smartcontract-abis/_index";
import {
  determineTradeType,
  ensureInfiniteApproval,
  ensureStandardApproval,
  validateNetwork,
} from "../../../lib/_index";
import { RouteOptimizer } from "../../routing/RouteOptimizer";
import { TradeCreationDto } from "../types/dto/TradeCreationDto";

export class UniswapV2Strategy implements ITradingStrategy {
  private router: UniswapV2RouterV2;
  private factory: UniswapV2Factory;

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
    this.factory = new UniswapV2Factory(chain);

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

    const tradePath = [this.WETH_ADDRESS, this.USDC_ADDRESS];
    const inputAmount = ethers.parseUnits("1", this.WETH_DECIMALS);

    const amountsOut = await this.router.getAmountsOut(wallet, inputAmount, tradePath);
    const amountOut = amountsOut[amountsOut.length - 1];
    const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);
    return amountFormatted;
  }

  /**
   * Gets a comprehensive quote for a buy trade by mirroring the exact transaction creation logic
   * @param wallet Connected wallet to query the price
   * @param trade Buy trade creation parameters
   * @returns TradeQuote with all execution details
   */
  async getQuote(trade: TradeCreationDto, wallet: Wallet): Promise<Quote> {
    await validateNetwork(wallet, this.chain);

    const inputToken: ERC20 | null = await createMinimalErc20(trade.inputToken, wallet.provider!);
    const outputToken: ERC20 | null = await createMinimalErc20(trade.outputToken, wallet.provider!);

    const tradeType: TradeType = determineTradeType(trade);

    switch (tradeType) {
      case TradeType.ETHInputTOKENOutput:
        return this.quoteEthToTokenTrade(trade, outputToken, wallet);
      case TradeType.TOKENInputTOKENOutput:
        return this.quoteTokenToTokenTrade(trade, inputToken, outputToken, wallet);
      case TradeType.TOKENInputETHOutput:
        return this.quoteTokenToEthTrade(trade, inputToken, wallet);
      default:
        throw new Error("Unknown trade type");
    }
  }

  /**
   * Creates a transaction based on the provided trade parameters
   * Includes price impact validation and slippage protection
   * @param wallet Connected wallet to create transaction for
   * @param trade trade creation parameters
   * @returns Transaction request object ready to be sent
   * @throws Error if price impact exceeds maximum allowed percentage
   */
  async createTransaction(trade: TradeCreationDto, wallet: Wallet): Promise<TransactionRequest> {
    await validateNetwork(wallet, this.chain);

    const to = wallet.address;
    const deadline = TRADING_CONFIG.DEADLINE;

    const inputToken: ERC20 | null = await createMinimalErc20(trade.inputToken, wallet.provider!);
    const outputToken: ERC20 | null = await createMinimalErc20(trade.outputToken, wallet.provider!);

    const tradeType: TradeType = determineTradeType(trade);

    switch (tradeType) {
      case TradeType.TOKENInputTOKENOutput:
        return await this.createTokenToTokenTX(trade, inputToken, outputToken, to, deadline, wallet);
      case TradeType.TOKENInputETHOutput:
        return await this.createTokenToEthTX(trade, inputToken, to, deadline, wallet);
      case TradeType.ETHInputTOKENOutput:
        return await this.createEthToTokenTX(trade, outputToken, to, deadline, wallet);
      default:
        throw new Error("Unknown trade type");
    }
  }

  private async quoteEthToTokenTrade(
    trade: TradeCreationDto,
    outputToken: ERC20 | null,
    wallet: Wallet,
  ): Promise<Quote> {
    let quote: Quote = {
      outputAmount: "0",
      priceImpact: 0,
      route: {
        amountOut: 0n,
        path: [],
        fees: [],
        encodedPath: null,
        poolKey: null,
      },
    };

    if (!outputToken) {
      return quote;
    }

    let amountIn = 0n;
    if (trade.inputType === InputType.USD) {
      const ethUsdcPrice = await this.getEthUsdcPrice(wallet);
      const ethValue = parseFloat(trade.inputAmount) / parseFloat(ethUsdcPrice);
      const ethValueFixed = ethValue.toFixed(18);
      amountIn = ethers.parseEther(ethValueFixed);
    } else {
      amountIn = ethers.parseEther(trade.inputAmount);
    }

    quote.route = await this.routeOptimizer.getBestUniV2Route(
      wallet,
      trade.inputToken,
      amountIn,
      outputToken.getTokenAddress(),
    );

    quote.outputAmount = ethers.formatUnits(quote.route.amountOut, outputToken.getDecimals());

    return quote;
  }

  private async quoteTokenToEthTrade(trade: TradeCreationDto, inputToken: ERC20 | null, wallet: Wallet) {
    let quote: Quote = {
      outputAmount: "0",
      priceImpact: 0,
      route: {
        amountOut: 0n,
        path: [],
        fees: [],
        encodedPath: null,
        poolKey: null,
      },
    };

    if (!inputToken) {
      return quote;
    }

    const amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());

    quote.route = await this.routeOptimizer.getBestUniV2Route(
      wallet,
      inputToken.getTokenAddress(),
      amountIn,
      trade.outputToken,
    );

    quote.outputAmount = ethers.formatEther(quote.route.amountOut);

    return quote;
  }

  private async quoteTokenToTokenTrade(
    trade: TradeCreationDto,
    inputToken: ERC20 | null,
    outputToken: ERC20 | null,
    wallet: Wallet,
  ) {
    let quote: Quote = {
      outputAmount: "0",
      priceImpact: 0,
      route: {
        amountOut: 0n,
        path: [],
        fees: [],
        encodedPath: null,
        poolKey: null,
      },
    };

    if (!inputToken || !outputToken) {
      return quote;
    }

    const amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());

    quote.route = await this.routeOptimizer.getBestUniV2Route(
      wallet,
      inputToken.getTokenAddress(),
      amountIn,
      trade.outputToken,
    );

    quote.outputAmount = ethers.formatUnits(quote.route.amountOut, outputToken.getDecimals());

    return quote;
  }

  private async createEthToTokenTX(
    trade: TradeCreationDto,
    outputToken: ERC20 | null,
    to: string,
    deadline: number,
    wallet: Wallet,
  ) {
    let tx: TransactionRequest = {};
    if (!outputToken) throw Error("Stop");

    if (trade.inputType === InputType.USD) {
      const ethUsdcPrice = await this.getEthUsdcPrice(wallet);
      const ethValue = parseFloat(trade.inputAmount) / parseFloat(ethUsdcPrice);
      const ethValueFixed = ethValue.toFixed(18);
      const amountIn = ethers.parseEther(ethValueFixed);
    } else {
      const amountIn = ethers.parseEther(trade.inputAmount);
    }
    const amountOutMin = 0n;
    const path = [this.WETH_ADDRESS, outputToken!.getTokenAddress()];
    tx = await this.router.createSwapExactETHForTokensTransaction(amountOutMin, path, to, deadline);
    return tx;
  }

  private async createTokenToEthTX(
    trade: TradeCreationDto,
    inputToken: ERC20 | null,
    to: string,
    deadline: number,
    wallet: Wallet,
  ) {
    let tx: TransactionRequest = {};

    if (!inputToken) throw Error("STOP");
    const amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());

    const path = [inputToken.getTokenAddress(), this.WETH_ADDRESS];

    const sellAmount = parseFloat(trade.inputAmount);
    const usdSellPrice = 1;

    const theoreticalOutput = await this.getTheoreticalEthOutput(wallet, sellAmount, usdSellPrice);
    const quotedOutput = await this.getActualEthOutput(wallet, inputToken, amountIn);
    const priceImpact = this.calculatePriceImpact(theoreticalOutput, quotedOutput);

    if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
      throw new Error(
        `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
      );
    }

    const rawTokensReceived = ethers.parseEther(quotedOutput.toString());
    const slippageAmount = (rawTokensReceived * BigInt(TRADING_CONFIG.SLIPPAGE_TOLERANCE * 100)) / 100n;
    const amountOutMin = rawTokensReceived - slippageAmount;

    tx = this.router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, path, to, deadline);

    return tx;
  }

  private async createTokenToTokenTX(
    trade: TradeCreationDto,
    inputToken: ERC20 | null,
    outputToken: ERC20 | null,
    to: string,
    deadline: number,
    wallet: Wallet,
  ) {
    let tx: TransactionRequest = {};
    if (!inputToken) throw new Error("Stop");
    if (!outputToken) throw new Error("Stop");

    const amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());
    const path = [inputToken.getTokenAddress(), outputToken.getTokenAddress()];

    const sellAmount = parseFloat(trade.inputAmount);
    const usdSellPrice = 1;

    const theoreticalOutput = await this.getTheoreticalTokenOutput(sellAmount, usdSellPrice); // Returns USD Value
    const quotedOutput = await this.getActualTokenOutput(wallet, inputToken, amountIn);
    const priceImpact = this.calculatePriceImpact(theoreticalOutput, quotedOutput);

    if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
      throw new Error(
        `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
      );
    }

    const quotedOutputFixed = quotedOutput.toFixed(18);
    const rawTokensReceived = ethers.parseEther(quotedOutputFixed);
    const slippageAmount = (rawTokensReceived * BigInt(TRADING_CONFIG.SLIPPAGE_TOLERANCE * 100)) / 100n;
    const amountOutMin = rawTokensReceived - slippageAmount;

    tx = this.router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, path, to, deadline);
    return tx;
  }

  /**
   * Gets WETH liquidity for a token pair (used for confidence calculation)
   * @param wallet Connected wallet to query liquidity
   * @param tokenAddress Address of the token to check liquidity for
   * @returns WETH liquidity amount as a string
   */
  private async getTokenWethLiquidity(wallet: Wallet, tokenAddress: string): Promise<string> {
    try {
      const pairAddress: string | null = await this.factory.getPairAddress(wallet, tokenAddress, this.WETH_ADDRESS);
      if (!pairAddress || pairAddress === ethers.ZeroAddress) return "0";

      const encodedData = ERC20_INTERFACE.encodeFunctionData("balanceOf", [pairAddress]);
      const tx: TransactionRequest = {
        to: this.WETH_ADDRESS,
        data: encodedData,
      };

      const ethLiquidity = await wallet.call(tx);
      const ethLiquidityFormatted = ethers.formatEther(ethLiquidity);
      return ethLiquidityFormatted;
    } catch (error) {
      return "0";
    }
  }

  /**
   * Estimates price impact for buy trades (simplified calculation)
   * @param wallet Connected wallet
   * @param tokenIn Input token
   * @param amountIn Input amount
   * @param tokensReceived Expected output
   * @param tokenOut Output token
   * @returns Estimated price impact percentage
   */
  private async estimateBuyPriceImpact(
    wallet: Wallet,
    tokenIn: ERC20,
    amountIn: bigint,
    tokensReceived: bigint,
    tokenOut: ERC20,
  ): Promise<number> {
    try {
      // For buy trades, price impact is harder to calculate without a reference price
      // We'll estimate based on trade size vs liquidity
      const inputLiquidity = await this.getTokenWethLiquidity(wallet, tokenIn.getTokenAddress());
      const liquidityValue = parseFloat(inputLiquidity);

      if (liquidityValue === 0) return 5; // High impact if no liquidity data

      const tradeSize = parseFloat(ethers.formatUnits(amountIn, tokenIn.getDecimals()));
      const ethUsdPrice = await this.getEthUsdcPrice(wallet);
      const tradeSizeUsd = tradeSize * parseFloat(ethUsdPrice); // Rough USD estimate

      // Simple heuristic: impact increases with trade size relative to liquidity
      const impactFactor = (tradeSizeUsd / (liquidityValue * parseFloat(ethUsdPrice))) * 100;
      return Math.min(impactFactor, 50); // Cap at 50%
    } catch (error) {
      return 2; // Default conservative estimate
    }
  }

  /**
   * Calculates the theoretical token output based on current market prices
   * @param sellAmount Amount of tokens to sell
   * @param usdValue USD value per token
   * @returns Theoretical USD value that should be received
   */
  private async getTheoreticalTokenOutput(sellAmount: number, usdValue: number): Promise<number> {
    return sellAmount * usdValue;
  }

  /**
   * Gets the actual USDC output from router for a token sell
   * @param wallet Connected wallet
   * @param tokenIn Token to sell
   * @param amountIn Amount of tokens to sell
   * @returns Actual USDC amount that would be received
   */
  private async getActualTokenOutput(wallet: Wallet, tokenIn: ERC20, amountIn: bigint): Promise<number> {
    const path = [tokenIn.getTokenAddress(), this.WETH_ADDRESS, this.USDC_ADDRESS];
    const amountsOut: BigInt[] = await this.router.getAmountsOut(wallet, amountIn, path);
    const amountOut = amountsOut[amountsOut.length - 1];

    const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);
    return parseFloat(amountFormatted);
  }

  /**
   * Calculates the theoretical ETH output based on current market prices
   * @param wallet Connected wallet
   * @param sellAmount Amount of tokens to sell
   * @param usdValue USD value per token
   * @returns Theoretical ETH amount that should be received
   */
  private async getTheoreticalEthOutput(wallet: Wallet, sellAmount: number, usdValue: number): Promise<number> {
    const totalUsdValue = sellAmount * usdValue;
    const ethUsdPrice = await this.getEthUsdcPrice(wallet);
    return totalUsdValue / parseFloat(ethUsdPrice);
  }

  /**
   * Gets the actual ETH output from router for a token sell
   * @param wallet Connected wallet
   * @param tokenIn Token to sell
   * @param amountIn Amount of tokens to sell
   * @returns Actual ETH amount that would be received
   */
  private async getActualEthOutput(wallet: Wallet, tokenIn: ERC20, amountIn: bigint): Promise<number> {
    const path = [tokenIn.getTokenAddress(), this.WETH_ADDRESS];
    const amountsOut: BigInt[] = await this.router.getAmountsOut(wallet, amountIn, path);
    const amountOut = amountsOut[amountsOut.length - 1];

    const amountFormatted = ethers.formatUnits(amountOut.toString(), this.WETH_DECIMALS);
    return parseFloat(amountFormatted);
  }

  /**
   * Calculates the price impact percentage
   * @param theoreticalAmount Theoretical amount of tokens
   * @param actualAmount Actual amount of tokens
   * @returns Price impact percentage
   */
  private calculatePriceImpact(theoreticalAmount: number, actualAmount: number): number {
    if (theoreticalAmount <= 0) return 0;
    const impact = ((theoreticalAmount - actualAmount) / theoreticalAmount) * 100;
    return Math.max(0, impact);
  }
}
