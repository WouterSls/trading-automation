import { Wallet, ethers } from "ethers";
import { ChainType } from "../../../lib/types/trading.types";
import { UniswapV2Router } from "../../uniswap-v2/UniswapV2Router";
import { AbstractTradingStrategy } from "./AbstractTradingStrategy";
import { ERC20 } from "../../ERC/ERC20";
import { BuyTrade } from "../trades/BuyTrade";
import { UniswapV2Factory } from "../../uniswap-v2/UniswapV2Factory";
import { ERC20_INTERFACE } from "../../../contract-abis/erc20";

export class UniswapV2Strategy extends AbstractTradingStrategy {
  private router: UniswapV2Router;
  private factory: UniswapV2Factory;

  constructor(STRATEGY_NAME: string, chain: ChainType) {
    super(STRATEGY_NAME, chain);
    this.router = new UniswapV2Router(chain);
    this.factory = new UniswapV2Factory(chain);
  }

  /**
   * Getters
   */
  async getETHLiquidity(wallet: Wallet, tokenAddress: string): Promise<string> {
    const pairAddress: string | null = await this.factory!.getPairAddress(wallet, tokenAddress);
    if (!pairAddress) throw new Error(`No pair found for ${tokenAddress} and ${this.router!.getWETHAddress()}`);

    const weth = new ethers.Contract(this.router!.getWETHAddress(), ERC20_INTERFACE, wallet);
    const ethLiquidity = await weth.balanceOf(pairAddress);
    const ethLiquidityFormatted = ethers.formatEther(ethLiquidity);
    return ethLiquidityFormatted;
  }

  /**
   * Buy
   */
  async buy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<BuyTrade> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }
  async simulateBuy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<boolean> {
    await this.router.simulateBuySwap(wallet, token, usdAmount);
    return true;
  }
}
