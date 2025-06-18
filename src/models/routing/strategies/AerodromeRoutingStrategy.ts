import { Wallet } from "ethers";
import { BaseRoutingStrategy } from "../BaseRoutingStrategy";
import { Route } from "../../trading/types/quoting-types";
import { Multicall3 } from "../../smartcontracts/multicall3/Multicall3";
import { AerodromeRouter } from "../../smartcontracts/aerodrome/AerodromeRouter";

export class AerodromeRoutingStrategy extends BaseRoutingStrategy {
  private intermediaryTokens: string[] = [];

  private aerodromeRouter: AerodromeRouter;
  private multicall3: Multicall3;

  constructor(chain: any) {
    super(chain);
    this.intermediaryTokens = this.getIntermediaryTokens();

    this.aerodromeRouter = new AerodromeRouter(chain);
    this.multicall3 = new Multicall3(chain);
  }

  async getBestRoute(wallet: Wallet, tokenIn: string, amountIn: bigint, tokenOut: string): Promise<Route> {
    throw new Error("Not implemented");
  }
}


