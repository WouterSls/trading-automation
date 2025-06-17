import { Contract, ethers, Wallet, TransactionRequest } from "ethers";

import { getChainConfig, ChainType } from "../../../config/chain-config";

import { UNISWAP_V2_ROUTER_INTERFACE } from "../../../lib/smartcontract-abis/uniswap-v2";
import { validateNetwork } from "../../../lib/utils";

export class UniswapV2RouterV2 {
  private routerAddress: string;
  private routerContract: Contract;

  constructor(private chain: ChainType) {
    const chainConfig = getChainConfig(chain);

    this.routerAddress = chainConfig.uniswap.v2.routerAddress;

    if (!this.routerAddress || this.routerAddress.trim() === "") {
      throw new Error(`UniV2 Router address not defined for chain: ${chainConfig.name}`);
    }

    this.routerContract = new ethers.Contract(this.routerAddress, UNISWAP_V2_ROUTER_INTERFACE);
  }

  getRouterAddress = (): string => this.routerAddress;

  /**
   * Calls the getAmountsOut function on V2Router to get a quote for a trade
   * @param wallet connection to the blockchain
   * @param amountIn the amount of input tokens (first token in path)
   * @param path the path to trade along side of
   * @returns the amount of tokens received on each hop
   */
  async getAmountsOut(wallet: Wallet, amountIn: bigint, path: string[]): Promise<bigint[]> {
    this.routerContract = this.routerContract.connect(wallet) as Contract;

    await this._networkAndRouterCheck(wallet);

    const amountsOut = await this.routerContract.getAmountsOut(amountIn, path);

    return amountsOut;
  }

  /**
   * Function for encoding getAmountsOut call data
   * Can be used in multicall transaction crafting
   *
   * @param amountIn the amount of input tokens (first token in path)
   * @param path the path to trade along side of
   * @returns The encoded function call data
   */
  encodeGetAmountsOut(amountIn: bigint, path: string[]): string {
    const encodedData = this.routerContract.interface.encodeFunctionData("getAmountsOut", [amountIn, path]);

    return encodedData;
  }

  /**
   * Function for decoding getAmountsOut call result data
   * Can be used in multicall transaction crafting
   *
   * @param data - the resulting hex byte data from the call request
   * @returns the amount of tokens received on each hop
   */
  decodeGetAmountsOutResult(data: ethers.BytesLike): bigint[] {
    const [amountsOut] = this.routerContract.interface.decodeFunctionResult("getAmountsOut", data);

    return amountsOut;
  }

  /**
   * Creates a swapExactETHForToken transaction
   * @param amountOutMin the minimum amount of tokens to receive
   * @param path the path to trade along side of
   * @param to the recipient of the token
   * @param deadline the expiration deadline of the trade
   * @returns a transaction request with encoded data and the target of the transaction filled
   */
  createSwapExactETHForTokensTransaction(
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: number,
  ): TransactionRequest {
    const encodedData = this.routerContract.interface.encodeFunctionData("swapExactETHForTokens", [
      amountOutMin,
      path,
      to,
      deadline,
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }

  /**
   * Creates a swapExactETHForToken transaction
   * @param amountIn the amount of input tokens
   * @param amountOutMin the minimum amount of tokens to receive
   * @param path the path to trade along side of
   * @param to the recipient of the token
   * @param deadline the expiration deadline of the trade
   * @returns a transaction request with encoded data and the target of the transaction filled
   */
  createSwapExactTokensForETHTransaction(
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: number,
  ): TransactionRequest {
    const encodedData = this.routerContract.interface.encodeFunctionData("swapExactTokensForETH", [
      amountIn,
      amountOutMin,
      path,
      to,
      deadline,
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }

  /**
   * Creates a swapExactTokensForTokens transaction
   * @param amountIn the amount of input tokens
   * @param amountOutMin the minimum amount of tokens to receive
   * @param path the path to trade along side of
   * @param to the recipient of the token
   * @param deadline the expiration deadline of the trade
   * @returns a transaction request with encoded data and the target of the transaction filled
   */
  createSwapExactTokensForTokensTransaction(
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: number,
  ): TransactionRequest {
    const encodedData = this.routerContract.interface.encodeFunctionData("swapExactTokensForTokens", [
      amountIn,
      amountOutMin,
      path,
      to,
      deadline,
    ]);

    const tx: TransactionRequest = {
      to: this.routerAddress,
      data: encodedData,
    };

    return tx;
  }



  /**
   * Validates that the wallet is on the correct network and that the router address is valid
   * @param wallet Wallet instance -> blockchain provider
   * @returns void if the checks pass, throws if not router or incorrect network
   */
  private async _networkAndRouterCheck(wallet: Wallet): Promise<void> {
    try {
      await validateNetwork(wallet, this.chain);

      const code = await wallet.provider!.getCode(this.routerAddress);
      if (code === "0x" || code === "0x0") {
        throw new Error(`No contract found at router address: ${this.routerAddress}`);
      }

      const amountA = 1n;
      const reserveA = 1000n;
      const reserveB = 1000n;

      await this.routerContract.quote.staticCall(amountA, reserveA, reserveB);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      const functionNotFoundError =
        errorMessage.includes("function not found") ||
        errorMessage.includes("not a function") ||
        errorMessage.includes("unknown function");

      const missingProviderError =
        errorMessage.toLowerCase().includes("cannot read property") ||
        errorMessage.toLowerCase().includes("cannot read properties") ||
        errorMessage.includes("missing provider");

      if (functionNotFoundError) {
        throw new Error(`Contract at ${this.routerAddress} is not a Uniswap V2 Router`);
      }

      if (missingProviderError) {
        throw new Error(`Wallet has missing provider: ${errorMessage}`);
      }

      throw new Error(`${errorMessage}`);
    }
  }
}
