import { Contract, ethers, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { MULTICALL3_INTERFACE } from "../../../lib/smartcontract-abis/multicall3";
import { Multicall3Request, Multicall3Result } from "./multicall3-types";

export class Multicall3 {
  private multicall3Address: string;

  private multicall3Contract: Contract;

  constructor(chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.multicall3Address = chainConfig.multicall3Address;

    if (!this.multicall3Address || this.multicall3Address.trim() === "") {
      throw new Error(`Multicall3 address not defined for chain: ${chainConfig.name}`);
    }

    this.multicall3Contract = new ethers.Contract(this.multicall3Address, MULTICALL3_INTERFACE);
  }

  getMulticall3Address = () => this.multicall3Address;

  /**
   * Function for calling multicall3 aggregate3 method with a static call
   *
   * @param wallet - the wallet / provider to use for the call
   * @param multicall3Request - The multicall request(s) (in Call3 tuple type) that should be aggregated by the multicall contract
   * @returns Result tuple for each call  {bool: call succeeded, bytes: returnData}
   */
  async aggregate3StaticCall(wallet: Wallet, multicall3Request: Multicall3Request[]): Promise<Multicall3Result[]> {
    this.multicall3Contract = this.multicall3Contract.connect(wallet) as Contract;

    const rawResults = await this.multicall3Contract.aggregate3.staticCall(multicall3Request);

    return rawResults.map((result: [boolean, string]) => ({
      success: result[0],
      returnData: result[1],
    }));
  }
}
