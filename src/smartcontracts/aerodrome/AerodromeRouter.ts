import { Contract, ethers, TransactionRequest, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../config/chain-config";
import { AERODROME_ROUTER_INTERFACE } from "../../lib/smartcontract-abis/_index";
import { AerodromeTradeRoute } from "./aerodrome-types";
import { validateNetwork } from "../../lib/utils";

export class AerodromeRouter {
  private routerContract: Contract;

  private routerAddress: string;
  private factoryAddress: string;

  constructor(private chain: ChainType) {
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

  async getAmountsOut(wallet: Wallet, amountIn: bigint, routes: AerodromeTradeRoute[]) {
    await validateNetwork(wallet, this.chain);
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    const amountsOut = await this.routerContract.getAmountsOut(amountIn, routes);
    const amountOut = amountsOut[amountsOut.length - 1];
    return amountOut;
  }

  encodeGetAmountsOut(amountIn: bigint, routes: AerodromeTradeRoute[]) {
    const encodedData = this.routerContract.interface.encodeFunctionData("getAmountsOut", [amountIn, routes]);
    return encodedData;
  }

  decodedGetAmountsOutResult(data: ethers.BytesLike): bigint[] {
    const decodedResult = this.routerContract.interface.decodeFunctionResult("getAmountsOut", data);
    
    if (decodedResult && decodedResult.length > 0) {
      const amountsOut = decodedResult[0];
      if (Array.isArray(amountsOut)) {
        return amountsOut.map((amount: any) => BigInt(amount.toString()));
      }
    }
    
    throw new Error("Failed to decode getAmountsOut result - invalid structure");
  }

  createSwapExactETHForTokensTransaction(
    amountOutMin: bigint,
    routes: AerodromeTradeRoute[],
    to: string,
    deadline: number,
  ): TransactionRequest {
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

  async createSwapExactTokensForTokensTransaction(
    amountIn: bigint,
    amountOutMin: bigint,
    routes: AerodromeTradeRoute[],
    to: string,
    deadline: number,
  ): Promise<TransactionRequest> {
    const encodedData = this.routerContract.interface.encodeFunctionData("swapExactTokensForTokens", [
      amountIn,
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

  async createSwapExactTokensForETHTransaction(
    amountIn: bigint,
    amountOutMin: bigint,
    routes: AerodromeTradeRoute[],
    to: string,
    deadline: number,
  ): Promise<TransactionRequest> {
    const encodedData = this.routerContract.interface.encodeFunctionData("swapExactTokensForETH", [
      amountIn,
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
