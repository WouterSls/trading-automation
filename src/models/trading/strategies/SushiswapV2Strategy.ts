import { Wallet } from "ethers";
import { ChainType } from "../../../config/chain-config";
import { ERC20 } from "../../ERC/ERC20";
import { BuyTrade } from "../trades/BuyTrade";
import { ITradingStrategy } from "../ITradingStrategy";

export class SushiswapV2Strategy implements ITradingStrategy {
  private strategyName: string;
  private chain: ChainType;

  constructor(STRATEGY_NAME: string, chain: ChainType) {
    this.strategyName = STRATEGY_NAME;
    this.chain = chain;
  }

  getName = (): string => this.strategyName;
  getChain = (): ChainType => this.chain;

  async getETHLiquidity(wallet: Wallet): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      resolve("0");
    });
  }

  async getUsdcPrice(wallet: Wallet): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      resolve("0");
    });
  }

  async buy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<BuyTrade> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }

  async simulateBuy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }
}
