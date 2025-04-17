import { TransactionLike, TransactionRequest, Wallet, ethers } from "ethers";
import { ChainType } from "../../../config/chain-config";
import { UniswapV2Router, UniswapV2Factory } from "../../uniswap-v2/index";
import { ERC20 } from "../../ERC/ERC20";
import { BuyTrade } from "../trades/BuyTrade";
import { ERC20_INTERFACE } from "../../../contract-abis/erc20";
import { ITradingStrategy } from "../ITradingStrategy";

export class UniswapV2Strategy implements ITradingStrategy {
  private router: UniswapV2Router;
  private factory: UniswapV2Factory;

  private strategyName: string;
  private chain: ChainType;

  constructor(STRATEGY_NAME: string, chain: ChainType) {
    this.strategyName = STRATEGY_NAME;
    this.chain = chain;
    this.router = new UniswapV2Router(chain);
    this.factory = new UniswapV2Factory(chain);
  }

  /**
   * Getters
   */
  getName = (): string => this.strategyName;
  getChain = (): ChainType => this.chain;

  async getETHLiquidity(wallet: Wallet, tokenAddress: string): Promise<string> {
    const pairAddress: string | null = await this.factory!.getPairAddress(wallet, tokenAddress);
    if (!pairAddress) throw new Error(`No pair found for ${tokenAddress} and ${this.factory!.getWETHAddress()}`);

    const weth = new ethers.Contract(this.factory!.getWETHAddress(), ERC20_INTERFACE, wallet);
    const ethLiquidity = await weth.balanceOf(pairAddress);
    const ethLiquidityFormatted = ethers.formatEther(ethLiquidity);
    return ethLiquidityFormatted;
  }

  async getUsdcPrice(wallet: Wallet, tokenAddress: string): Promise<string> {
    throw new Error("Not implemented");
    return "0";
  }

  /**
   * Buy
   */
  async buy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<BuyTrade> {
    let tx: TransactionRequest | TransactionLike;
    tx = await this.router.createSwapExactETHInputTransaction(wallet, token, usdAmount);
    console.log("tx request:", tx);
    tx = await wallet.populateTransaction(tx);
    console.log("populated tx:", tx);
    throw new Error("Not implemented");
    const txResponse = await wallet.sendTransaction(tx);
    const txReceipt = await txResponse.wait();
  }
  async simulateBuy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<boolean> {
    await this.router.simulateBuySwap(wallet, token, usdAmount);
    return true;
  }

  private async getV2Reserves(wallet: Wallet, tokenAddress: string) {
    try {
      const pair = await this.factory.getPair(wallet, tokenAddress);
      const WETH_ADDRESS = this.factory.getWETHAddress();

      if (pair.getAddress() === ethers.ZeroAddress) {
        return ethers.ZeroAddress;
      }

      const reserves = await pair.getReserves();

      const token0 = tokenAddress.toLowerCase() < WETH_ADDRESS!.toLowerCase() ? tokenAddress : WETH_ADDRESS;
      const [reserveToken, reserveETH] =
        token0 === tokenAddress ? [reserves.reserve0, reserves.reserve1] : [reserves.reserve1, reserves.reserve0];

      return {
        liquidityTokens: reserveToken.toString(),
        liquidityEth: reserveETH.toString(),
        pairAddress: pair.getAddress(),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`${tokenAddress} - ${errorMessage}`);
      return ethers.ZeroAddress;
    }
  }
}
