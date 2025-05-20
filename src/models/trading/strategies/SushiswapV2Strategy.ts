import { Wallet } from "ethers";
import { ChainType } from "../../../config/chain-config";
import { ERC20 } from "../../blockchain/ERC/ERC20";
import { BuyTrade, SellTrade, OutputToken } from "../types/_index";
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
}
