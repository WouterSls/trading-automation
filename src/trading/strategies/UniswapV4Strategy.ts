import { ethers, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";

import { FeeAmount, FeeToTickSpacing, PoolKey } from "../../smartcontracts/uniswap-v4/uniswap-v4-types";
import { ensureInfiniteApproval, ensureStandardApproval, ensurePermit2Approval } from "../../lib/approval-strategies";

import { ITradingStrategy } from "../ITradingStrategy";
import { Quote, InputType, Route, TradeCreationDto, TradeType } from "../types/_index";
import { createMinimalErc20 } from "../../smartcontracts/ERC/erc-utils";
import { calculatePriceImpact, calculateSlippageAmount, determineTradeType, validateNetwork } from "../../lib/utils";
import { TRADING_CONFIG } from "../../config/trading-config";
import { UniswapV4Quoter } from "../../smartcontracts/uniswap-v4/UniswapV4Quoter";
import {
  UniswapV4Router,
  SwapExactInputSingleParams,
  SettleAllParams,
  TakeAllParams,
  SettleAllParamsOld,
} from "../../smartcontracts/uniswap-v4/UniswapV4Router";
import { UniversalRouter } from "../../smartcontracts/universal-router/UniversalRouter";
import {
  CommandType,
  V4PoolAction,
  V4PoolActionConstants,
} from "../../smartcontracts/universal-router/universal-router-types";
import { RouteOptimizer } from "../../routing/RouteOptimizer";
import { ERC20 } from "../../smartcontracts/ERC/ERC20";
import { determineSwapDirection } from "../../smartcontracts/uniswap-v4/uniswap-v4-utils";

export class UniswapV4Strategy implements ITradingStrategy {
  private quoter: UniswapV4Quoter;
  private uniswapV4router: UniswapV4Router;
  private universalRouter: UniversalRouter;

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

    this.quoter = new UniswapV4Quoter(chain);
    this.uniswapV4router = new UniswapV4Router();
    this.universalRouter = new UniversalRouter(chain);

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
    const spender = this.universalRouter.getRouterAddress();
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

    const tokenIn = ethers.ZeroAddress;
    const tokenOut = this.USDC_ADDRESS;
    const fee = FeeAmount.LOW;
    const tickSpacing = FeeToTickSpacing.get(fee)!;

    const poolKey: PoolKey = {
      currency0: tokenIn,
      currency1: tokenOut,
      fee: fee,
      tickSpacing: tickSpacing,
      hooks: ethers.ZeroAddress,
    };
    const zeroForOne = true;
    const exactAmount = ethers.parseEther("1");
    const hookData = ethers.ZeroAddress;

    const { amountOut, gasEstimate } = await this.quoter.quoteExactInputSingle(
      wallet,
      poolKey,
      zeroForOne,
      exactAmount,
      hookData,
    );

    const formattedAmountOut = ethers.formatUnits(amountOut, this.USDC_DECIMALS);

    return formattedAmountOut;
  }

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

    quote.route = await this.routeOptimizer.getBestUniV4Route(trade.inputToken, amountIn, trade.outputToken, wallet);

    quote.outputAmount = ethers.formatUnits(quote.route.amountOut, outputDecimals);

    return quote;
  }

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

    const route = await this.routeOptimizer.getBestUniV4Route(trade.inputToken, amountIn, trade.outputToken, wallet);
    if (!route.poolKey && !route.pathSegments) throw new Error("Error during best Uniswap V4 route generation");

    // TODO: implemented expected output logic for price impact
    //const expectedOutput = await this.calculateExpectedOutput(amountInForSpotRate, amountIn, route.path, wallet);
    const expectedOutput = 0n;
    const actualOutput = route.amountOut;

    const priceImpact = calculatePriceImpact(expectedOutput, actualOutput);
    if (priceImpact > TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE) {
      throw new Error(
        `Price impact too high: ${priceImpact}%, max allowed: ${TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE}%`,
      );
    }

    const slippageAmount = calculateSlippageAmount(actualOutput);
    //const amountOutMin = actualOutput - slippageAmount;
    const amountOutMin = 0n;

    const isSinglehop = route.path.length === 2 && route.poolKey;
    const isMultihop = route.path.length > 2 && route.pathSegments;

    const hookData = ethers.ZeroAddress;

    switch (tradeType) {
      case TradeType.ETHInputTOKENOutput:
      case TradeType.TOKENInputTOKENOutput:
      case TradeType.TOKENInputETHOutput:
        if (isMultihop) {
        } else {
          const zeroForOne = determineSwapDirection(trade.inputToken, route.poolKey!);
          const inputCurrency = zeroForOne ? route.poolKey!.currency0 : route.poolKey!.currency1;
          const outputCurrency = zeroForOne ? route.poolKey!.currency1 : route.poolKey!.currency0;
          const amount = V4PoolActionConstants.OPEN_DELTA;

          const actions = ethers.concat([V4PoolAction.SWAP_EXACT_IN_SINGLE, V4PoolAction.SETTLE, V4PoolAction.TAKE]);

          const swapParams: SwapExactInputSingleParams = [route.poolKey!, zeroForOne, amountIn, amountOutMin, hookData];
          const swapData = this.uniswapV4router.encodePoolAction(V4PoolAction.SWAP_EXACT_IN_SINGLE, swapParams);

          const settleAllParams: SettleAllParamsOld = [inputCurrency, amountIn, zeroForOne];
          //const settleAllParams: SettleAllParams = [inputCurrency, amountIn];
          const settleAllData = this.uniswapV4router.encodePoolAction(V4PoolAction.SETTLE_ALL, settleAllParams);

          const takeAllParams: TakeAllParams = [outputCurrency, to, amount];
          const takeAllData = this.uniswapV4router.encodePoolAction(V4PoolAction.TAKE_ALL, takeAllParams);

          const v4SwapCommandInput = this.uniswapV4router.encodeV4SwapCommandInput(actions, [
            swapData,
            settleAllData,
            takeAllData,
          ]);

          const command: CommandType = CommandType.V4_SWAP;

          tx = this.universalRouter.createExecuteTransaction(command, [v4SwapCommandInput], deadline);
        }

        if (tradeType === TradeType.ETHInputTOKENOutput) {
          tx.value = amountIn;
        }

        tx;
        break;
      default:
        throw new Error("Unknown trade type");
    }

    return tx;
  }
}
