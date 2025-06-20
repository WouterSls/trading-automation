import { ethers, Wallet } from "ethers";
import { BaseRoutingStrategy } from "../BaseRoutingStrategy";
import { Route } from "../../trading/types/quoting-types";
import { Multicall3 } from "../../smartcontracts/multicall3/Multicall3";
import { FeeAmount, UniswapV3QuoterV2 } from "../../smartcontracts/uniswap-v3";
import {
  Multicall3Context,
  Multicall3Request,
  Multicall3Result,
  Mutlicall3Metadata,
} from "../../smartcontracts/multicall3/multicall3-types";

export class UniswapV3RoutingStrategy extends BaseRoutingStrategy {
  private intermediaryTokens: string[] = [];

  private uniswapV3QuoterV2: UniswapV3QuoterV2;
  private multicall3: Multicall3;

  constructor(chain: any) {
    super(chain);
    this.intermediaryTokens = this.getIntermediaryTokens();

    this.uniswapV3QuoterV2 = new UniswapV3QuoterV2(chain);
    this.multicall3 = new Multicall3(chain);
  }

  async getBestRoute(wallet: Wallet, tokenIn: string, amountIn: bigint, tokenOut: string): Promise<Route> {
    tokenIn = tokenIn === ethers.ZeroAddress ? this.chainConfig.tokenAddresses.weth : tokenIn;

    const multicall3Contexts: Multicall3Context[] = [];
    let requestIndex = 0;

    const directRoutesMulticallContexts = this.createDirectRouteMulticall3Contexts(
      tokenIn,
      amountIn,
      tokenOut,
      requestIndex,
    );
    multicall3Contexts.push(...directRoutesMulticallContexts);
    requestIndex += directRoutesMulticallContexts.length;

    const multicall3Request: Multicall3Request[] = multicall3Contexts.map((context) => context.request);
    const multicall3Results: Multicall3Result[] = await this.multicall3.aggregate3StaticCall(wallet, multicall3Request);

    const bestRoute = this.findBestRouteFromResults(multicall3Results, multicall3Contexts);

    return bestRoute;
  }

  createDirectRouteMulticall3Contexts(
    tokenIn: string,
    amountIn: bigint,
    tokenOut: string,
    startingRequestIndex: number,
  ): Multicall3Context[] {
    const multicall3Contexts: Multicall3Context[] = [];

    let currentRequestIndex = startingRequestIndex;

    const fees = [FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH];
    const recipient = ethers.ZeroAddress;
    const amountOutMin = 0n;
    const sqrtPriceLimitX96 = 0n;

    for (const fee of fees) {
      const callData = this.uniswapV3QuoterV2.encodeQuoteExactInputSingle(
        tokenIn,
        tokenOut,
        fee,
        recipient,
        amountIn,
        amountOutMin,
        sqrtPriceLimitX96,
      );

      const request: Multicall3Request = {
        target: this.uniswapV3QuoterV2.getQuoterAddress(),
        allowFailure: true,
        callData: callData,
      };

      const metadata: Mutlicall3Metadata = {
        requestIndex: currentRequestIndex,
        type: "quote",
        path: [tokenIn, tokenOut],
        fees: [fee],
        description: `${tokenIn} -> ${tokenOut} | ${fee}`,
      };

      multicall3Contexts.push({ request, metadata });
      currentRequestIndex++;
    }

    return multicall3Contexts;
  }

  createMultihopRouteMulticall3Contexts() {}

  private findBestRouteFromResults(
    multicall3Results: Multicall3Result[],
    multicall3Contexts: Multicall3Context[],
  ): Route {
    let bestRoute: Route | null = null;
    let bestAmountOut = 0n;

    for (let i = 0; i < multicall3Results.length; i++) {
      const result = multicall3Results[i];
      const context = multicall3Contexts[i];

      if (!result.success || !result.returnData) {
        console.log(`Route failed: ${context.metadata.description}`);
        continue;
      }

      try {
        const isMultihop = context.metadata.path.length > 2;
        let amountOut;

        if (isMultihop) {
          const { amountOut: decoded } = this.uniswapV3QuoterV2.decodeQuoteExactInputResult(result.returnData);
          amountOut = decoded;
        } else {
          const { amountOut: decoded } = this.uniswapV3QuoterV2.decodeQuoteExactInputSingleResult(result.returnData);
          amountOut = decoded;
        }

        console.log(`Route: ${context.metadata.description} | AmountOut: ${amountOut.toString()}`);

        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          bestRoute = {
            path: context.metadata.path,
            fees: context.metadata.fees!, // Default fee if not specified
            encodedPath: null,
            poolKey: null,
          };
        }
      } catch (error) {
        console.error(`Failed to decode route result for: ${context.metadata.description}`, error);
      }
    }

    if (!bestRoute) {
      console.warn("No valid routes found, returning default route");
      return {
        path: [],
        fees: [],
        encodedPath: null,
        poolKey: null,
      };
    }

    console.log();
    console.log(
      `Best route selected: ${bestRoute.path.join(" -> ")} with fees: ${bestRoute.fees.join(" -> ")} | output: ${bestAmountOut.toString()}`,
    );
    return bestRoute;
  }
}
