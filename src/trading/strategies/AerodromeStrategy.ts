import { TransactionRequest, Wallet, ethers } from "ethers";

import { ChainType, getChainConfig } from "../../config/chain-config";
import { TRADING_CONFIG } from "../../config/trading-config";

import { ERC20, createMinimalErc20 } from "../../smartcontracts/ERC/_index";
import { AerodromeRouter } from "../../smartcontracts/aerodrome/AerodromeRouter";
import { AerodromePoolFactory } from "../../smartcontracts/aerodrome/AerodromePoolFactory";
import { TradeRoute } from "../../smartcontracts/aerodrome/aerodrome-types";

import { ITradingStrategy } from "../ITradingStrategy";
import { InputType, Quote, TradeCreationDto } from "../types/_index";

import { ERC20_INTERFACE } from "../../lib/smartcontract-abis/_index";
import { ensureInfiniteApproval, ensureStandardApproval, validateNetwork } from "../../lib/_index";

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

  async getQuote(trade: TradeCreationDto, wallet: Wallet): Promise<Quote> {
    throw new Error("Not implemented");
  }

  async createTransaction(trade: TradeCreationDto, wallet: Wallet): Promise<TransactionRequest> {
    throw new Error("Not implemented");
  }

  /**
   * Creates a buy transaction based on the provided trade parameters
   * @param wallet Connected wallet to create transaction for
   * @param trade Buy trade creation parameters
   * @returns Transaction request object ready to be sent
   */
  async createBuyTransaction(wallet: Wallet, trade: TradeCreationDto): Promise<TransactionRequest> {
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

      if (!tokenIn || !tokenOut) throw new Error("Token error");

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
}
