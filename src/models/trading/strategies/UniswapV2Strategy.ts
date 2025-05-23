import { TransactionRequest, Wallet, ethers } from "ethers";
import { ChainType, getChainConfig, getOutputTokenAddress } from "../../../config/chain-config";
import { UniswapV2RouterV2, UniswapV2Factory } from "../../blockchain/uniswap-v2/index";
import { InputType, OutputToken } from "../types/_index";
import { ERC20_INTERFACE } from "../../../lib/contract-abis/erc20";
import { ITradingStrategy } from "../ITradingStrategy";
import { BuyTradeCreationDto, SellTradeCreationDto } from "../types/_index";
import { TRADING_CONFIG } from "../../../config/trading-config";
import { ERC20, createMinimalErc20 } from "../../blockchain/ERC/_index";

export class UniswapV2Strategy implements ITradingStrategy {
  private router: UniswapV2RouterV2;
  private factory: UniswapV2Factory;

  private WETH_ADDRESS: string;
  private USDC_ADDRESS: string;

  private WETH_DECIMALS = 18;
  private USDC_DECIMALS = 6;

  constructor(
    private STRATEGY_NAME: string,
    private CHAIN: ChainType,
  ) {
    const chainConfig = getChainConfig(CHAIN);

    this.WETH_ADDRESS = chainConfig.tokenAddresses.weth;
    this.USDC_ADDRESS = chainConfig.tokenAddresses.usdc;

    this.router = new UniswapV2RouterV2(CHAIN);
    this.factory = new UniswapV2Factory(CHAIN);
  }

  getName = (): string => this.STRATEGY_NAME;
  async getEthUsdcPrice(wallet: Wallet): Promise<string> {
    const tradePath = [this.WETH_ADDRESS, this.USDC_ADDRESS];
    const inputAmount = ethers.parseUnits("1", this.WETH_DECIMALS);

    const amountsOut = await this.router.getAmountsOut(wallet, inputAmount, tradePath);
    const amountOut = amountsOut[amountsOut.length - 1];
    const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);
    return amountFormatted;
  }
  async getTokenEthLiquidity(wallet: Wallet, tokenAddress: string): Promise<string> {
    const pairAddress: string | null = await this.factory!.getPairAddress(wallet, tokenAddress, this.WETH_ADDRESS);
    if (!pairAddress) throw new Error(`No pair found for ${tokenAddress} and ${this.WETH_ADDRESS}`);

    const encodedData = ERC20_INTERFACE.encodeFunctionData("balanceOf", [pairAddress]);

    const tx: TransactionRequest = {
      to: this.WETH_ADDRESS,
      data: encodedData,
    };

    const ethLiquidity = await wallet.call(tx);

    const ethLiquidityFormatted = ethers.formatEther(ethLiquidity);
    return ethLiquidityFormatted;
  }
  async getTokenUsdcPrice(wallet: Wallet, tokenAddress: string): Promise<string> {
    if (!wallet.provider) throw new Error("No Blockchain provider");
    const token = await createMinimalErc20(tokenAddress, wallet.provider!);

    const tradePath = [tokenAddress, this.WETH_ADDRESS, this.USDC_ADDRESS];
    console.log("tradePath:");
    console.log(tradePath);
    const inputAmount = ethers.parseUnits("1", token.getDecimals());

    const amountsOut: BigInt[] = await this.router.getAmountsOut(wallet, inputAmount, tradePath);
    const amountOut = amountsOut[amountsOut.length - 1];

    const amountFormatted = ethers.formatUnits(amountOut.toString(), this.USDC_DECIMALS);
    return amountFormatted;
  }

  async createBuyTransaction(wallet: Wallet, trade: BuyTradeCreationDto): Promise<TransactionRequest> {
    console.log(trade);
    const to = wallet.address;
    const tokenOut = await createMinimalErc20(trade.outputToken, wallet.provider!);
    const deadline = TRADING_CONFIG.DEADLINE;

    let tx: TransactionRequest = {};

    // TODO: should protect inputToken = 0X0
    if (trade.inputType === InputType.ETH) {
      const path = [this.WETH_ADDRESS, trade.outputToken];
      const amountIn = ethers.parseEther(trade.inputAmount);

      const amountsOut = await this.router.getAmountsOut(wallet, amountIn, path);
      const tokensReceived = amountsOut[amountsOut.length - 1];
      const amountOutMin = (tokensReceived * 95n) / 100n;

      tx = this.router.createSwapExactETHForTokensTransaction(amountOutMin, path, to, deadline);
      // TODO: we might need to increase value to cover gas fees aswell. does value parameter pay for gas?
      tx.value = amountIn;
      // TODO: should protect inputToken = 0X0 or USDC address
    } else if (trade.inputType === InputType.USD && trade.inputToken === ethers.ZeroAddress) {
      const path = [this.WETH_ADDRESS, trade.outputToken];
      const ethUsdcPrice = await this.getEthUsdcPrice(wallet);
      const ethValue = parseFloat(trade.inputAmount) / parseFloat(ethUsdcPrice);

      const amountIn = ethers.parseEther(ethValue.toString());

      const amountsOut = await this.router.getAmountsOut(wallet, amountIn, path);
      const tokensReceived = amountsOut[amountsOut.length - 1];
      const amountOutMin = (tokensReceived * 95n) / 100n;

      tx = this.router.createSwapExactETHForTokensTransaction(amountOutMin, path, to, deadline);
      // TODO: we might need to increase value to cover gas fees aswell. does value parameter pay for gas?
      tx.value = amountIn;
    } else {
      const tokenIn = await createMinimalErc20(trade.inputToken, wallet.provider!);
      const path = [trade.inputToken, this.WETH_ADDRESS, trade.outputToken];
      const amountIn = ethers.parseUnits(trade.inputAmount, tokenIn.getDecimals());

      const amountsOut = await this.router.getAmountsOut(wallet, amountIn, path);
      const tokensReceived = amountsOut[amountsOut.length - 1];
      const expectedOutputAmount = ethers.parseUnits(tokensReceived.toString(), tokenOut.getDecimals());
      const amountOutMin = (expectedOutputAmount * 95n) / 100n;

      tx = this.router.createSwapExactTokensForTokensTransaction(amountIn, amountOutMin, path, to, deadline);
    }

    return tx;
  }
  async createSellTransaction(wallet: Wallet, trade: SellTradeCreationDto): Promise<TransactionRequest> {
    const tokenIn = await createMinimalErc20(trade.inputToken, wallet.provider!);
    const amountIn = ethers.parseUnits(trade.inputAmount, tokenIn.getDecimals());

    const sellAmount = parseFloat(trade.inputAmount);
    const usdSellPrice = parseFloat(trade.tradingPointPrice);

    let quotedOutput;
    let priceImpact;
    let path;

    if (trade.outputToken === "USDC") {
      path = [tokenIn.getTokenAddress(), this.WETH_ADDRESS, this.USDC_ADDRESS];
      const theoreticalUsdcOutput = await this.getTheoreticalUsdcTokenOutput(sellAmount, usdSellPrice);
      quotedOutput = await this.getActualUsdcOutput(wallet, tokenIn, amountIn);
      priceImpact = this.calculatePriceImpact(theoreticalUsdcOutput, quotedOutput);
    } else {
      path = [tokenIn.getTokenAddress(), this.WETH_ADDRESS];
      const theoreticalEthOutput = await this.getTheoreticalEthOutput(wallet, sellAmount, usdSellPrice);
      quotedOutput = await this.getActualEthOutput(wallet, tokenIn, amountIn);
      priceImpact = this.calculatePriceImpact(theoreticalEthOutput, quotedOutput);
    }

    if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
      throw new Error(
        `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
      );
    }

    const deadline = TRADING_CONFIG.DEADLINE;
    const rawTokensReceived = ethers.parseUnits(quotedOutput.toString(), tokenIn.getDecimals());
    const slippageAmount = rawTokensReceived * BigInt(TRADING_CONFIG.SLIPPAGE_TOLERANCE);
    const amountOutMin = rawTokensReceived - slippageAmount;

    let tx: TransactionRequest;
    switch (trade.outputToken) {
      case "WETH":
        tx = this.router.createSwapExactTokensForTokensTransaction(
          amountIn,
          amountOutMin,
          path,
          wallet.address,
          deadline,
        );
        return tx;
      case "USDC":
        tx = this.router.createSwapExactTokensForTokensTransaction(
          amountIn,
          amountOutMin,
          path,
          wallet.address,
          deadline,
        );
        return tx;
      default:
        tx = this.router.createSwapExactTokensForETHTransaction(amountIn, amountOutMin, path, wallet.address, deadline);
        return tx;
    }
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
