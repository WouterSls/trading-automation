import { TransactionLike, TransactionRequest, Wallet, ethers } from "ethers";
import { ChainConfig, ChainType, getChainConfig } from "../../../config/chain-config";
import { UniswapV2Router, UniswapV2Factory } from "../../blockchain/uniswap-v2/index";
import { ERC20 } from "../../blockchain/ERC/ERC20";
import { BuyTrade, SellTrade, OutputToken } from "../types/_index";
import { ERC20_INTERFACE } from "../../../lib/contract-abis/erc20";
import { ITradingStrategy } from "../ITradingStrategy";

export class UniswapV2Strategy implements ITradingStrategy {
  private router: UniswapV2Router;
  private factory: UniswapV2Factory;

  private strategyName: string;
  private chain: ChainType;
  private chainConfig: ChainConfig;

  private WETH_ADDRESS: string;

  constructor(STRATEGY_NAME: string, chain: ChainType) {
    this.strategyName = STRATEGY_NAME;
    this.chain = chain;
    this.chainConfig = getChainConfig(chain);

    this.WETH_ADDRESS = this.chainConfig.tokenAddresses.weth;

    this.router = new UniswapV2Router(chain);
    this.factory = new UniswapV2Factory(chain);
  }

  /**
   * Getters
   */
  getName = (): string => this.strategyName;
  getChain = (): ChainType => this.chain;

  async getETHLiquidity(wallet: Wallet, tokenAddress: string): Promise<string> {
    const wethAddress = this.chainConfig.tokenAddresses.weth;
    const pairAddress: string | null = await this.factory!.getPairAddress(wallet, tokenAddress, wethAddress);
    if (!pairAddress) throw new Error(`No pair found for ${tokenAddress} and ${wethAddress}`);

    //TODO: encode transaction instead of instantiating contract
    const weth = new ethers.Contract(wethAddress, ERC20_INTERFACE, wallet);
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

  async sell(wallet: Wallet, erc20: ERC20, tokenAmount: number, outputToken: OutputToken): Promise<SellTrade> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }
  async simulateSell(wallet: Wallet, token: ERC20, tokenAmount: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }

  private async getV2Reserves(wallet: Wallet, tokenAddress: string) {
    try {
      const pair = await this.factory.getPair(wallet, tokenAddress, this.WETH_ADDRESS);

      if (!pair) {
        return null;
      }

      const reserves = await pair.getReserves();

      const token0 = tokenAddress.toLowerCase() < this.WETH_ADDRESS!.toLowerCase() ? tokenAddress : this.WETH_ADDRESS;
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
