import { Wallet } from "ethers";
import { BaseRoutingStrategy } from "../BaseRoutingStrategy";
import { Route } from "../../trading/types/quoting-types";
import { Multicall3 } from "../../smartcontracts/multicall3/Multicall3";
import { UniswapV3QuoterV2 } from "../../smartcontracts/uniswap-v3";

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
    throw new Error("Not implemented");
  }
}
