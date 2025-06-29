import { TransactionRequest, Wallet, ethers } from "ethers";

import { ChainType, getChainConfig } from "../../../config/chain-config";
import { TRADING_CONFIG } from "../../../config/trading-config";

import { ERC20, createMinimalErc20 } from "../../smartcontracts/ERC/_index";
import { UniswapV2RouterV2, UniswapV2Factory } from "../../smartcontracts/uniswap-v2/index";

import { ITradingStrategy } from "../ITradingStrategy";
import { BuyTradeCreationDto, SellTradeCreationDto, InputType, Quote, OutputType, Route } from "../types/_index";

import { ERC20_INTERFACE } from "../../../lib/smartcontract-abis/_index";
import { ensureInfiniteApproval, ensureStandardApproval, validateNetwork } from "../../../lib/_index";
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
  async getBuyTradeQuote(wallet: Wallet, trade: BuyTradeCreationDto): Promise<Quote> {
    await validateNetwork(wallet, this.chain);

    const outputToken = await createMinimalErc20(trade.outputToken, wallet.provider!);

    let outputAmount = "0";
    let priceImpact = 0;
    let route: Route = {
      amountOut: 0n,
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
    };

    const isETHInputETHAmount = trade.inputType === InputType.ETH && trade.inputToken === ethers.ZeroAddress;
    const isETHInputUSDAmount = trade.inputType === InputType.USD && trade.inputToken === ethers.ZeroAddress;
    const isTOKENInputTOKENAmount = trade.inputType === InputType.TOKEN && trade.inputToken !== ethers.ZeroAddress;

    if (isETHInputETHAmount) {
      const amountIn = ethers.parseEther(trade.inputAmount);

      route = await this.routeOptimizer.getBestUniV2Route(
        wallet,
        trade.inputToken,
        amountIn,
        outputToken.getTokenAddress(),
      );

      outputAmount = ethers.formatUnits(route.amountOut, outputToken.getDecimals());
    }

    if (isETHInputUSDAmount) {
      const ethUsdcPrice = await this.getEthUsdcPrice(wallet);
      const ethValue = parseFloat(trade.inputAmount) / parseFloat(ethUsdcPrice);
      const ethValueFixed = ethValue.toFixed(18);
      const amountIn = ethers.parseEther(ethValueFixed);

      route = await this.routeOptimizer.getBestUniV2Route(
        wallet,
        trade.inputToken,
        amountIn,
        outputToken.getTokenAddress(),
      );

      outputAmount = ethers.formatUnits(route.amountOut, outputToken.getDecimals());
    }

    if (isTOKENInputTOKENAmount) {
      const tokenIn = await createMinimalErc20(trade.inputToken, wallet.provider!);
      const amountIn = ethers.parseUnits(trade.inputAmount, tokenIn.getDecimals());

      route = await this.routeOptimizer.getBestUniV2Route(
        wallet,
        tokenIn.getTokenAddress(),
        amountIn,
        outputToken.getTokenAddress(),
      );

      outputAmount = ethers.formatUnits(route.amountOut, outputToken.getDecimals());

      priceImpact = await this.estimateBuyPriceImpact(wallet, tokenIn, amountIn, route.amountOut, outputToken);
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
   * @returns TradeQuote with all execution details including price impact validation
   */
  async getSellTradeQuote(wallet: Wallet, trade: SellTradeCreationDto): Promise<Quote> {
    await validateNetwork(wallet, this.chain);

    const inputToken = await createMinimalErc20(trade.inputToken, wallet.provider!);

    let outputAmount = "0";
    let priceImpact = 0;
    let route: Route = {
      amountOut: 0n,
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
    };

    const sellAmount = parseFloat(trade.inputAmount);
    const usdSellPrice = parseFloat(trade.tradingPointPrice);

    const isTOKENInputETHOutput =
      trade.inputToken !== ethers.ZeroAddress &&
      trade.outputType === OutputType.ETH &&
      trade.outputToken === ethers.ZeroAddress;

    const isTOKENInputTOKENOutput =
      trade.inputToken !== ethers.ZeroAddress &&
      trade.outputType === OutputType.TOKEN &&
      trade.outputToken !== ethers.ZeroAddress;

    if (isTOKENInputETHOutput) {
      const amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());

      route = await this.routeOptimizer.getBestUniV2Route(wallet, trade.inputToken, amountIn, ethers.ZeroAddress);

      const theoreticalOutput = await this.getTheoreticalEthOutput(wallet, sellAmount, usdSellPrice);
      const quotedOutput = await this.getActualEthOutput(wallet, inputToken, amountIn);

      priceImpact = this.calculatePriceImpact(theoreticalOutput, quotedOutput);

      outputAmount = quotedOutput.toString();
    }

    if (isTOKENInputTOKENOutput) {
      const amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());
      const outputToken = await createMinimalErc20(trade.outputToken, wallet.provider!);

      route = await this.routeOptimizer.getBestUniV2Route(wallet, trade.inputToken, amountIn, trade.outputToken);

      const OUTPUT_TOKEN_USD_PRICE = 9999999; // temp value
      const INPUT_TOKEN_USD_PRICE = 100; // temp value
      const theoreticalOutput = (parseFloat(trade.inputAmount) * INPUT_TOKEN_USD_PRICE) / OUTPUT_TOKEN_USD_PRICE;

      const amountsOut = await this.router.getAmountsOut(wallet, amountIn, route.path);
      const tokensReceived = amountsOut[amountsOut.length - 1];
      const formattedTokensReceived = ethers.formatUnits(tokensReceived, outputToken.getDecimals());
      const quotedOutput = parseFloat(formattedTokensReceived);

      priceImpact = this.calculatePriceImpact(theoreticalOutput, quotedOutput);

      outputAmount = quotedOutput.toString();
    }

    return {
      outputAmount,
      priceImpact,
      route,
    };
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

    const to = wallet.address;
    const deadline = TRADING_CONFIG.DEADLINE;

    let tx: TransactionRequest = {};

    const isETHInputETHAmount = trade.inputType === InputType.ETH && trade.inputToken === ethers.ZeroAddress;
    const isETHInputUSDAmount = trade.inputType === InputType.USD && trade.inputToken === ethers.ZeroAddress;
    const isTOKENInputTOKENAmount = trade.inputType === InputType.TOKEN && trade.inputToken !== ethers.ZeroAddress;

    if (isETHInputETHAmount) {
      // TODO: add optimal path calculation
      const path = [this.WETH_ADDRESS, outputToken.getTokenAddress()];

      const amountIn = ethers.parseEther(trade.inputAmount);

      const amountsOut = await this.router.getAmountsOut(wallet, amountIn, path);
      const tokensReceived = amountsOut[amountsOut.length - 1];
      const amountOutMin = (tokensReceived * 95n) / 100n;

      tx = this.router.createSwapExactETHForTokensTransaction(amountOutMin, path, to, deadline);
      tx.value = amountIn;
    }

    if (isETHInputUSDAmount) {
      // TODO: add optimal path calculation
      const path = [this.WETH_ADDRESS, outputToken.getTokenAddress()];

      const ethUsdcPrice = await this.getEthUsdcPrice(wallet);
      const ethValue = parseFloat(trade.inputAmount) / parseFloat(ethUsdcPrice);

      const ethValueFixed = ethValue.toFixed(18);
      const amountIn = ethers.parseEther(ethValueFixed);

      const amountsOut = await this.router.getAmountsOut(wallet, amountIn, path);
      const tokensReceived = amountsOut[amountsOut.length - 1];
      const amountOutMin = (tokensReceived * 95n) / 100n;

      tx = this.router.createSwapExactETHForTokensTransaction(amountOutMin, path, to, deadline);
      tx.value = amountIn;
    }

    if (isTOKENInputTOKENAmount) {
      const tokenIn = await createMinimalErc20(trade.inputToken, wallet.provider!);
      const amountIn = ethers.parseUnits(trade.inputAmount, tokenIn.getDecimals());

      // TODO: add optimal path calculation
      const path = [tokenIn.getTokenAddress(), this.WETH_ADDRESS, outputToken.getTokenAddress()];

      const amountsOut = await this.router.getAmountsOut(wallet, amountIn, path);
      const tokensReceived = amountsOut[amountsOut.length - 1];
      const expectedOutputAmount = ethers.parseUnits(tokensReceived.toString(), outputToken.getDecimals());
      const amountOutMin = (expectedOutputAmount * 95n) / 100n;

      tx = this.router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, path, to, deadline);
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
    await validateNetwork(wallet, this.chain);

    const inputToken = await createMinimalErc20(trade.inputToken, wallet.provider!);

    const to = wallet.address;
    const deadline = TRADING_CONFIG.DEADLINE;

    let tx: TransactionRequest = {};

    let theoreticalOutput;
    let quotedOutput;
    let priceImpact;
    let path;
    let rawTokensReceived;

    const sellAmount = parseFloat(trade.inputAmount);
    const usdSellPrice = parseFloat(trade.tradingPointPrice);

    const isTOKENInputETHOutput =
      trade.inputToken !== ethers.ZeroAddress &&
      trade.outputType === OutputType.ETH &&
      trade.outputToken === ethers.ZeroAddress;

    const isTOKENInputTOKENOutput =
      trade.inputToken !== ethers.ZeroAddress &&
      trade.outputType === OutputType.TOKEN &&
      trade.outputToken !== ethers.ZeroAddress;

    if (isTOKENInputETHOutput) {
      const amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());

      path = [inputToken.getTokenAddress(), this.WETH_ADDRESS];

      theoreticalOutput = await this.getTheoreticalEthOutput(wallet, sellAmount, usdSellPrice);
      quotedOutput = await this.getActualEthOutput(wallet, inputToken, amountIn);
      priceImpact = this.calculatePriceImpact(theoreticalOutput, quotedOutput);

      if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
        throw new Error(
          `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
        );
      }

      rawTokensReceived = ethers.parseEther(quotedOutput.toString());
      const slippageAmount = (rawTokensReceived * BigInt(TRADING_CONFIG.SLIPPAGE_TOLERANCE * 100)) / 100n;
      const amountOutMin = rawTokensReceived - slippageAmount;

      tx = this.router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, path, to, deadline);
    }

    if (isTOKENInputTOKENOutput) {
      const amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());
      const outputToken = await createMinimalErc20(trade.outputToken, wallet.provider!);

      path = [inputToken.getTokenAddress(), outputToken.getTokenAddress()];

      theoreticalOutput = await this.getTheoreticalTokenOutput(sellAmount, usdSellPrice); // Returns USD Value
      quotedOutput = await this.getActualTokenOutput(wallet, inputToken, amountIn);
      priceImpact = this.calculatePriceImpact(theoreticalOutput, quotedOutput);

      if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
        throw new Error(
          `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
        );
      }

      const quotedOutputFixed = quotedOutput.toFixed(18);
      rawTokensReceived = ethers.parseEther(quotedOutputFixed);
      const slippageAmount = (rawTokensReceived * BigInt(TRADING_CONFIG.SLIPPAGE_TOLERANCE * 100)) / 100n;
      const amountOutMin = rawTokensReceived - slippageAmount;

      tx = this.router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, path, to, deadline);
    }

    return tx;
  }

  /**
   * Gets a comprehensive quote for a buy trade by mirroring the exact transaction creation logic
   * @param wallet Connected wallet to query the price
   * @param trade Buy trade creation parameters
   * @returns TradeQuote with all execution details
   */
  async getTradeQuote(wallet: Wallet, trade: BuyTradeCreationDto): Promise<Quote> {
    await validateNetwork(wallet, this.chain);

    const outputToken = await createMinimalErc20(trade.outputToken, wallet.provider!);

    let outputAmount = "0";
    let priceImpact = 0;
    let route: Route = {
      amountOut: 0n,
      path: [],
      fees: [],
      encodedPath: null,
      poolKey: null,
    };

    const isETHInputETHAmount = trade.inputType === InputType.ETH && trade.inputToken === ethers.ZeroAddress;
    const isETHInputUSDAmount = trade.inputType === InputType.USD && trade.inputToken === ethers.ZeroAddress;
    const isTOKENInputTOKENAmount = trade.inputType === InputType.TOKEN && trade.inputToken !== ethers.ZeroAddress;

    if (isETHInputETHAmount && outputToken) {
      const amountIn = ethers.parseEther(trade.inputAmount);

      route = await this.routeOptimizer.getBestUniV2Route(
        wallet,
        trade.inputToken,
        amountIn,
        outputToken.getTokenAddress(),
      );

      outputAmount = ethers.formatUnits(route.amountOut, outputToken.getDecimals());
    }

    if (isETHInputUSDAmount && outputToken) {
      const ethUsdcPrice = await this.getEthUsdcPrice(wallet);
      const ethValue = parseFloat(trade.inputAmount) / parseFloat(ethUsdcPrice);
      const ethValueFixed = ethValue.toFixed(18);
      const amountIn = ethers.parseEther(ethValueFixed);

      route = await this.routeOptimizer.getBestUniV2Route(
        wallet,
        trade.inputToken,
        amountIn,
        outputToken.getTokenAddress(),
      );

      outputAmount = ethers.formatUnits(route.amountOut, outputToken.getDecimals());
    }

    if (isTOKENInputTOKENAmount && outputToken) {
      const tokenIn = await createMinimalErc20(trade.inputToken, wallet.provider!);
      const amountIn = ethers.parseUnits(trade.inputAmount, tokenIn!.getDecimals());

      route = await this.routeOptimizer.getBestUniV2Route(
        wallet,
        tokenIn!.getTokenAddress(),
        amountIn,
        outputToken.getTokenAddress(),
      );

      outputAmount = ethers.formatUnits(route.amountOut, outputToken.getDecimals());

      priceImpact = await this.estimateBuyPriceImpact(wallet, tokenIn!, amountIn, route.amountOut, outputToken);
    }

    return {
      outputAmount,
      priceImpact,
      route,
    };
  }

  /**
   * Creates a transaction based on the provided trade parameters
   * Includes price impact validation and slippage protection
   * @param wallet Connected wallet to create transaction for
   * @param trade Sell trade creation parameters
   * @returns Transaction request object ready to be sent
   * @throws Error if price impact exceeds maximum allowed percentage
   */
  async createTransaction(wallet: Wallet, trade: TradeCreationDto): Promise<TransactionRequest> {
    await validateNetwork(wallet, this.chain);

    const to = wallet.address;
    const deadline = TRADING_CONFIG.DEADLINE;

    let tx: TransactionRequest = {};

    let theoreticalOutput;
    let quotedOutput;
    let priceImpact;
    let path;
    let rawTokensReceived;

    const sellAmount = parseFloat(trade.inputAmount);
    const usdSellPrice = 1;
    //parseFloat(trade.tradingPointPrice);

    const inputToken: ERC20 | null = await createMinimalErc20(trade.inputToken, wallet.provider!);
    const outputToken: ERC20 | null = await createMinimalErc20(trade.outputToken, wallet.provider!);

    const isTOKENInputETHOutput =
      trade.inputType === InputType.TOKEN &&
      trade.inputToken !== ethers.ZeroAddress &&
      trade.outputToken === ethers.ZeroAddress &&
      inputToken &&
      !outputToken;

    const isTOKENInputTOKENOutput =
      trade.inputType === InputType.TOKEN &&
      trade.inputToken !== ethers.ZeroAddress &&
      trade.outputToken !== ethers.ZeroAddress &&
      inputToken &&
      outputToken;

    const isETHInputTOKENOutput =
      trade.inputType === InputType.ETH &&
      trade.inputToken === ethers.ZeroAddress &&
      trade.outputToken !== ethers.ZeroAddress;

    const isETHInputETHOutput =
      trade.inputType === InputType.ETH &&
      trade.inputToken === ethers.ZeroAddress &&
      trade.outputToken === ethers.ZeroAddress;

    const isUSDInputTOKENOutput =
      trade.inputType === InputType.USD &&
      trade.inputToken === ethers.ZeroAddress &&
      trade.outputToken !== ethers.ZeroAddress;

    const isUSDInputETHOutput =
      trade.inputType === InputType.USD &&
      trade.inputToken === ethers.ZeroAddress &&
      trade.outputToken === ethers.ZeroAddress;

    if (isTOKENInputETHOutput && inputToken) {
      const amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());

      path = [inputToken.getTokenAddress(), this.WETH_ADDRESS];

      theoreticalOutput = await this.getTheoreticalEthOutput(wallet, sellAmount, usdSellPrice);
      quotedOutput = await this.getActualEthOutput(wallet, inputToken, amountIn);
      priceImpact = this.calculatePriceImpact(theoreticalOutput, quotedOutput);

      if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
        throw new Error(
          `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
        );
      }

      rawTokensReceived = ethers.parseEther(quotedOutput.toString());
      const slippageAmount = (rawTokensReceived * BigInt(TRADING_CONFIG.SLIPPAGE_TOLERANCE * 100)) / 100n;
      const amountOutMin = rawTokensReceived - slippageAmount;

      tx = this.router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, path, to, deadline);
    }

    if (isTOKENInputTOKENOutput && inputToken && outputToken) {
      const amountIn = ethers.parseUnits(trade.inputAmount, inputToken.getDecimals());
      //const outputToken = await createMinimalErc20(trade.outputToken, wallet.provider!);

      path = [inputToken.getTokenAddress(), outputToken.getTokenAddress()];

      theoreticalOutput = await this.getTheoreticalTokenOutput(sellAmount, usdSellPrice); // Returns USD Value
      quotedOutput = await this.getActualTokenOutput(wallet, inputToken, amountIn);
      priceImpact = this.calculatePriceImpact(theoreticalOutput, quotedOutput);

      if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
        throw new Error(
          `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
        );
      }

      const quotedOutputFixed = quotedOutput.toFixed(18);
      rawTokensReceived = ethers.parseEther(quotedOutputFixed);
      const slippageAmount = (rawTokensReceived * BigInt(TRADING_CONFIG.SLIPPAGE_TOLERANCE * 100)) / 100n;
      const amountOutMin = rawTokensReceived - slippageAmount;

      tx = this.router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, path, to, deadline);
    }

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
