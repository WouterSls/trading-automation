import { TransactionRequest, Wallet, ethers } from "ethers";

import { ChainType, getChainConfig } from "../../../config/chain-config";
import { TRADING_CONFIG } from "../../../config/trading-config";

import { ERC20, createMinimalErc20 } from "../../blockchain/ERC/_index";
import { AerodromeRouter } from "../../blockchain/aerodrome/AerodromeRouter";
import { AerodromePoolFactory } from "../../blockchain/aerodrome/AerodromePoolFactory";
import { TradeRoute } from "../../blockchain/aerodrome/aerodrome-types";

import { ITradingStrategy } from "../ITradingStrategy";
import { BuyTradeCreationDto, SellTradeCreationDto, InputType } from "../types/_index";

import { ERC20_INTERFACE } from "../../../lib/contract-abis/_index";
import { ensureInfiniteApproval, ensureStandardApproval, validateNetwork } from "../../../lib/_index";

export class AerodromeStrategy implements ITradingStrategy {
  private router: AerodromeRouter;
  private factory: AerodromePoolFactory;

  private WETH_ADDRESS: string;
  private USDC_ADDRESS: string;

  private WETH_DECIMALS = 18;
  private USDC_DECIMALS = 6;

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

    const routes: TradeRoute[] = [
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
   * Gets the ETH liquidity for a given token pair
   * @param wallet Connected wallet to query liquidity
   * @param tokenAddress Address of the token to check liquidity for
   * @returns ETH liquidity amount as a string
   */
  async getTokenEthLiquidity(wallet: Wallet, tokenAddress: string): Promise<string> {
    await validateNetwork(wallet, this.chain);

    // Try both stable and volatile pools
    const stablePoolAddress = await this.factory.getPoolAddress(wallet, tokenAddress, this.WETH_ADDRESS, true);
    const volatilePoolAddress = await this.factory.getPoolAddress(wallet, tokenAddress, this.WETH_ADDRESS, false);

    let totalLiquidity = 0n;

    // Check stable pool liquidity
    if (stablePoolAddress && stablePoolAddress !== ethers.ZeroAddress) {
      const encodedData = ERC20_INTERFACE.encodeFunctionData("balanceOf", [stablePoolAddress]);
      const tx: TransactionRequest = {
        to: this.WETH_ADDRESS,
        data: encodedData,
      };
      const stableLiquidity = await wallet.call(tx);
      totalLiquidity += BigInt(stableLiquidity);
    }

    // Check volatile pool liquidity
    if (volatilePoolAddress && volatilePoolAddress !== ethers.ZeroAddress) {
      const encodedData = ERC20_INTERFACE.encodeFunctionData("balanceOf", [volatilePoolAddress]);
      const tx: TransactionRequest = {
        to: this.WETH_ADDRESS,
        data: encodedData,
      };
      const volatileLiquidity = await wallet.call(tx);
      totalLiquidity += BigInt(volatileLiquidity);
    }

    const ethLiquidityFormatted = ethers.formatEther(totalLiquidity);
    return ethLiquidityFormatted;
  }

  /**
   * Gets the current token price in USDC
   * @param wallet Connected wallet to query the price
   * @param tokenAddress Address of the token to get price for
   * @returns Token price in USDC as a string
   */
  async getTokenUsdcPrice(wallet: Wallet, tokenAddress: string): Promise<string> {
    await validateNetwork(wallet, this.chain);
    if (!wallet.provider) throw new Error("No Blockchain provider");

    const token = await createMinimalErc20(tokenAddress, wallet.provider!);

    const routes: TradeRoute[] = [
      {
        from: tokenAddress,
        to: this.WETH_ADDRESS,
        stable: false,
        factory: this.factory.getFactoryAddress(),
      },
      {
        from: this.WETH_ADDRESS,
        to: this.USDC_ADDRESS,
        stable: false,
        factory: this.factory.getFactoryAddress(),
      },
    ];

    const inputAmount = ethers.parseUnits("1", token.getDecimals());
    const amountOut = await this.router.getAmountsOut(wallet, inputAmount, routes);
    const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);
    return amountFormatted;
  }

  /**
   * Creates a buy transaction based on the provided trade parameters
   * @param wallet Connected wallet to create transaction for
   * @param trade Buy trade creation parameters
   * @returns Transaction request object ready to be sent
   */
  async createBuyTransaction(wallet: Wallet, trade: BuyTradeCreationDto): Promise<TransactionRequest> {
    await validateNetwork(wallet, this.chain);
    const to = wallet.address;
    const deadline = TRADING_CONFIG.DEADLINE;

    let tx: TransactionRequest = {};

    if (trade.inputType === InputType.ETH && trade.inputToken === ethers.ZeroAddress) {
      const routes: TradeRoute[] = [
        {
          from: this.WETH_ADDRESS,
          to: trade.outputToken,
          stable: false,
          factory: this.factory.getFactoryAddress(),
        },
      ];

      const amountIn = ethers.parseEther(trade.inputAmount);
      const amountOut = await this.router.getAmountsOut(wallet, amountIn, routes);
      const amountOutMin = (amountOut * 95n) / 100n;

      tx = await this.router.createSwapExactETHForTokensTransaction(wallet, amountOutMin, routes, to, deadline);
      tx.value = amountIn;
    } else if (trade.inputType === InputType.USD && trade.inputToken === ethers.ZeroAddress) {
      const routes: TradeRoute[] = [
        {
          from: this.WETH_ADDRESS,
          to: trade.outputToken,
          stable: false,
          factory: this.factory.getFactoryAddress(),
        },
      ];

      const ethUsdcPrice = await this.getEthUsdcPrice(wallet);
      const ethValue = parseFloat(trade.inputAmount) / parseFloat(ethUsdcPrice);
      const ethValueFixed = ethValue.toFixed(18);
      const amountIn = ethers.parseEther(ethValueFixed);

      const amountOut = await this.router.getAmountsOut(wallet, amountIn, routes);
      const amountOutMin = (amountOut * 95n) / 100n;

      tx = await this.router.createSwapExactETHForTokensTransaction(wallet, amountOutMin, routes, to, deadline);
      tx.value = amountIn;
    } else if (trade.inputType === InputType.TOKEN && trade.inputToken != ethers.ZeroAddress) {
      const tokenIn = await createMinimalErc20(trade.inputToken, wallet.provider!);
      const tokenOut = await createMinimalErc20(trade.outputToken, wallet.provider!);

      const routes: TradeRoute[] = [
        {
          from: tokenIn.getTokenAddress(),
          to: this.WETH_ADDRESS,
          stable: false,
          factory: this.factory.getFactoryAddress(),
        },
        {
          from: this.WETH_ADDRESS,
          to: tokenOut.getTokenAddress(),
          stable: false,
          factory: this.factory.getFactoryAddress(),
        },
      ];

      const amountIn = ethers.parseUnits(trade.inputAmount, tokenIn.getDecimals());
      const amountOut = await this.router.getAmountsOut(wallet, amountIn, routes);
      const amountOutMin = (amountOut * 95n) / 100n;

      tx = await this.router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, routes, to, deadline);
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
    const to = wallet.address;
    const deadline = TRADING_CONFIG.DEADLINE;

    const sellAmount = parseFloat(trade.inputAmount);
    const usdSellPrice = parseFloat(trade.tradingPointPrice);

    let theoreticalOutput;
    let quotedOutput;
    let priceImpact;
    let routes: TradeRoute[];
    let rawTokensReceived;
    let tx: TransactionRequest = {};

    if (trade.outputToken === "USDC" && trade.inputToken !== ethers.ZeroAddress) {
      const tokenIn = await createMinimalErc20(trade.inputToken, wallet.provider!);
      routes = [
        {
          from: tokenIn.getTokenAddress(),
          to: this.WETH_ADDRESS,
          stable: false,
          factory: this.factory.getFactoryAddress(),
        },
        {
          from: this.WETH_ADDRESS,
          to: this.USDC_ADDRESS,
          stable: false,
          factory: this.factory.getFactoryAddress(),
        },
      ];

      const amountIn = ethers.parseUnits(trade.inputAmount, tokenIn.getDecimals());

      theoreticalOutput = await this.getTheoreticalUsdcTokenOutput(sellAmount, usdSellPrice);
      quotedOutput = await this.getActualUsdcOutput(wallet, tokenIn, amountIn);
      priceImpact = this.calculatePriceImpact(theoreticalOutput, quotedOutput);

      if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
        throw new Error(
          `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
        );
      }

      rawTokensReceived = ethers.parseUnits(quotedOutput.toString(), this.USDC_DECIMALS);
      const slippageAmount = (rawTokensReceived * BigInt(TRADING_CONFIG.SLIPPAGE_TOLERANCE * 100)) / 100n;
      const amountOutMin = rawTokensReceived - slippageAmount;

      tx = await this.router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, routes, to, deadline);
    } else if (trade.outputToken === "WETH" && trade.inputToken !== ethers.ZeroAddress) {
      const tokenIn = await createMinimalErc20(trade.inputToken, wallet.provider!);
      routes = [
        {
          from: tokenIn.getTokenAddress(),
          to: this.WETH_ADDRESS,
          stable: false,
          factory: this.factory.getFactoryAddress(),
        },
      ];

      const amountIn = ethers.parseUnits(trade.inputAmount, tokenIn.getDecimals());

      theoreticalOutput = await this.getTheoreticalEthOutput(wallet, sellAmount, usdSellPrice);
      quotedOutput = await this.getActualEthOutput(wallet, tokenIn, amountIn);
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

      tx = await this.router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, routes, to, deadline);
    } else if (trade.outputToken === "ETH" && trade.inputToken !== ethers.ZeroAddress) {
      const tokenIn = await createMinimalErc20(trade.inputToken, wallet.provider!);
      routes = [
        {
          from: tokenIn.getTokenAddress(),
          to: this.WETH_ADDRESS,
          stable: false,
          factory: this.factory.getFactoryAddress(),
        },
      ];

      const amountIn = ethers.parseUnits(trade.inputAmount, tokenIn.getDecimals());

      theoreticalOutput = await this.getTheoreticalEthOutput(wallet, sellAmount, usdSellPrice);
      quotedOutput = await this.getActualEthOutput(wallet, tokenIn, amountIn);
      priceImpact = this.calculatePriceImpact(theoreticalOutput, quotedOutput);

      if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
        throw new Error(
          `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
        );
      }

      rawTokensReceived = ethers.parseEther(quotedOutput.toString());
      const slippageAmount = (rawTokensReceived * BigInt(TRADING_CONFIG.SLIPPAGE_TOLERANCE * 100)) / 100n;
      const amountOutMin = rawTokensReceived - slippageAmount;

      tx = await this.router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, routes, to, deadline);
    }
    // TODO: implement token to token sale
    /**
       else if (trade.outputToken === "TOKEN") {
       }
    */

    return tx;
  }

  /**
   * Calculates the theoretical token output based on current market prices
   * @param sellAmount Amount of tokens to sell
   * @param usdValue USD value per token
   * @returns Theoretical USD value that should be received
   */
  private async getTheoreticalUsdcTokenOutput(sellAmount: number, usdValue: number): Promise<number> {
    return sellAmount * usdValue;
  }

  /**
   * Gets the actual USDC output from router for a token sell
   * @param wallet Connected wallet
   * @param tokenIn Token to sell
   * @param amountIn Amount of tokens to sell
   * @returns Actual USDC amount that would be received
   */
  private async getActualUsdcOutput(wallet: Wallet, tokenIn: ERC20, amountIn: bigint): Promise<number> {
    const routes: TradeRoute[] = [
      {
        from: tokenIn.getTokenAddress(),
        to: this.WETH_ADDRESS,
        stable: false,
        factory: this.factory.getFactoryAddress(),
      },
      {
        from: this.WETH_ADDRESS,
        to: this.USDC_ADDRESS,
        stable: false,
        factory: this.factory.getFactoryAddress(),
      },
    ];

    const amountOut = await this.router.getAmountsOut(wallet, amountIn, routes);
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
    const routes: TradeRoute[] = [
      {
        from: tokenIn.getTokenAddress(),
        to: this.WETH_ADDRESS,
        stable: false,
        factory: this.factory.getFactoryAddress(),
      },
    ];

    const amountOut = await this.router.getAmountsOut(wallet, amountIn, routes);
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
