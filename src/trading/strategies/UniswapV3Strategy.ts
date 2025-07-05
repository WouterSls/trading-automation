import { ethers, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";

import { UniswapV3QuoterV2 } from "../../smartcontracts/uniswap-v3/UniswapV3QuoterV2";
import { UniswapV3Factory } from "../../smartcontracts/uniswap-v3/UniswapV3Factory";
import { UniswapV3SwapRouterV2 } from "../../smartcontracts/uniswap-v3/UniswapV3SwapRouterV2";

import { ITradingStrategy } from "../ITradingStrategy";
import { FeeAmount } from "../../smartcontracts/uniswap-v3/uniswap-v3-types";
import { InputType, Quote, TradeCreationDto, TradeType } from "../types/_index";
import { calculatePriceImpact, calculateSlippageAmount, determineTradeType, validateNetwork } from "../../lib/utils";
import { TRADING_CONFIG } from "../../config/trading-config";
import { ensureInfiniteApproval, ensurePermit2Approval, ensureStandardApproval } from "../../lib/approval-strategies";
import { createMinimalErc20 } from "../../smartcontracts/ERC/erc-utils";
import { RouteOptimizer } from "../../routing/RouteOptimizer";
import { Permit2 } from "../../smartcontracts/permit2/Permit2";
import { ERC20 } from "../../smartcontracts/ERC/ERC20";

// TODO: implement Test Suite
export class UniswapV3Strategy implements ITradingStrategy {
  private quoter: UniswapV3QuoterV2;
  private factory: UniswapV3Factory;
  private router: UniswapV3SwapRouterV2;
  private permit2: Permit2;

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
    this.permit2 = new Permit2(chain);

    this.routeOptimizer = new RouteOptimizer(chain);
  }

  /**
   * Gets the name of this trading strategy
   * @returns The strategy name
   */
  getName = (): string => this.strategyName;

  // TODO: Implement Permit2 (If supported)
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
      return null;
      //return await ensurePermit2Approval(wallet, tokenAddress, amount, this.permit2.getPermit2Address(), spender);
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

    quote.route = await this.routeOptimizer.getBestUniV3Route(trade.inputToken, amountIn, trade.outputToken, wallet);

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

    const route = await this.routeOptimizer.getBestUniV3Route(trade.inputToken, amountIn, trade.outputToken, wallet);

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
    const amountOutMin = actualOutput - slippageAmount;

    const sqrtPriceLimitX96 = 0n;

    const isMultihop = route.path.length > 2;

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
        throw new Error("Unknown trade type");
    }

    return tx;
  }
}
