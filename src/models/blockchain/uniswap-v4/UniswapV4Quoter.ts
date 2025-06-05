//https://docs.uniswap.org/contracts/v4/reference/periphery/interfaces/IV4Quoter
//https://etherscan.io/address/0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203

import { Contract, ethers, Wallet } from "ethers";
import { ChainType, getChainConfig } from "../../../config/chain-config";
import { UNISWAP_V4_QUOTER_INTERFACE } from "../../../lib/contract-abis/uniswap-v4";
import { PoolKey } from "./uniswap-v4-types";

export class UniswapV4Quoter {
  private quoterContract: Contract;
  private quoterAddress: string;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);
    this.quoterAddress = chainConfig.uniswap.v4.quoterAddress;

    if (!this.quoterAddress || this.quoterAddress.trim() === "") {
      throw new Error(`Quoter address not defined for chain: ${chainConfig.name}`);
    }

    this.quoterContract = new ethers.Contract(this.quoterAddress, UNISWAP_V4_QUOTER_INTERFACE);
  }

  getQuoterAddress = () => this.quoterAddress;

  async quoteExactInputSingle(
    wallet: Wallet,
    poolKey: PoolKey,
    zeroForOne: boolean,
    amountSpecified: bigint,
    hookData: string,
  ): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
    this.quoterContract = this.quoterContract.connect(wallet) as Contract;

    // await this._networkAndQuoterCheck(wallet);

    try {
      const { amountOut, gasEstimate } = await this.quoterContract.quoteExactInputSingle(
        poolKey,
        zeroForOne,
        amountSpecified,
        hookData,
      );
      return { amountOut, gasEstimate };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      if (errorMessage.toLowerCase().includes("no data present")) {
        return {
          amountOut: 0n,
          gasEstimate: 0n,
        };
      }

      throw new Error(errorMessage);
    }
  }
}
