import { Wallet } from "ethers";
import { BaseRoutingStrategy } from "../BaseRoutingStrategy";
import { Route } from "../../trading/types/quoting-types";
import { Multicall3 } from "../../smartcontracts/multicall3/Multicall3";
import { UniswapV4Quoter } from "../../smartcontracts/uniswap-v4/UniswapV4Quoter";

export class UniswapV4RoutingStrategy extends BaseRoutingStrategy {
  private intermediaryTokenList: string[] = [];

  private uniswapV4Quoter: UniswapV4Quoter;
  private multicall3: Multicall3;

  constructor(chain: any) {
    super(chain);
    this.intermediaryTokenList = this.getIntermediaryTokenList();

    this.uniswapV4Quoter = new UniswapV4Quoter(chain);
    this.multicall3 = new Multicall3(chain);
  }

  async getBestRoute(tokenIn: string, amountIn: bigint, tokenOut: string, wallet: Wallet): Promise<Route> {
    throw new Error("Not implemented");
  }
}
