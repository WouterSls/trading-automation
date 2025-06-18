import { ethers, Wallet } from "ethers";
import { BaseRoutingStrategy } from "../BaseRoutingStrategy";
import { Route } from "../../trading/types/quoting-types";
import { Multicall3 } from "../../smartcontracts/multicall3/Multicall3";
import { FeeAmount, UniswapV3QuoterV2 } from "../../smartcontracts/uniswap-v3";
import {
  Multicall3Context,
  Multicall3Request,
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
    requestIndex += directRoutesMulticallContexts.length;

    throw new Error("Not implemented");
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
        description: `${tokenIn} -> ${tokenOut}`,
      };

      multicall3Contexts.push({ request, metadata });
      currentRequestIndex++;
    }

    return multicall3Contexts;
  }

  createMultihopRouteMulticall3Contexts() {}
}
