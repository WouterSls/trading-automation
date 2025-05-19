import { Contract, TransactionRequest, Wallet } from "ethers";
import { ChainConfig, ChainType, getChainConfig } from "../../config/chain-config";
import { AERODROME_ROUTER_INTERFACE } from "../../contract-abis/aerodrome";
import { ExactETHForTokensParams, TradeRoute } from "./aerodrome-types";

export class AerodromeRouter {
  private routerContract: Contract;

  private routerAddress: string;
  private factoryAddress: string;

  constructor(chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.routerAddress = chainConfig.aerodrome.routerAddress;
    this.factoryAddress = chainConfig.aerodrome.poolFactoryAddress;

    if (!this.routerAddress || this.routerAddress.trim() === "") {
      throw new Error(`Aerodrome Router address not defined for chain: ${chainConfig.name}`);
    }

    this.routerContract = new Contract(this.routerAddress, AERODROME_ROUTER_INTERFACE);
  }

  getRouterAddress = (): string => this.routerAddress;
  getFactoryAddress = (): string => this.factoryAddress;

  async getAmountsOut(wallet: Wallet, amountIn: bigint, routes: TradeRoute[]) {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    const amountsOut = await this.routerContract.getAmountsOut(amountIn, routes);
    const amountOut = amountsOut[amountsOut.length - 1];
    return amountOut;
  }

  async createSwapExactETHForTokensTransaction(
    wallet: Wallet,
    amountOutMin: bigint,
    routes: TradeRoute[],
    to: string,
    deadline: number,
  ): Promise<TransactionRequest> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    const encodedData = this.routerContract.interface.encodeFunctionData("swapExactETHForTokens", [
      amountOutMin,
      routes,
      to,
      deadline,
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }
}
