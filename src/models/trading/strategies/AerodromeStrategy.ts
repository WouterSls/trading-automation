import { TransactionReceipt, Wallet } from "ethers";
import { ChainType } from "../../../config/chain-config";
import { ITradingStrategy } from "../ITradingStrategy";
import { BuyTradeCreationDto, SellTradeCreationDto } from "../../../api/trades/TradesController";

export class AerodromeStrategy implements ITradingStrategy {
  constructor(
    private strategyName: string,
    private chain: ChainType,
  ) {}

  getName = (): string => this.strategyName;
  async getEthUsdcPrice(wallet: Wallet): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      resolve("0");
    });
  }
  async getTokenEthLiquidity(wallet: Wallet): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      resolve("0");
    });
  }
  async getTokenUsdcPrice(wallet: Wallet): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      resolve("0");
    });
  }

  async createBuyTransaction(wallet: Wallet, trade: BuyTradeCreationDto): Promise<TransactionReceipt> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }

  async createSellTransaction(wallet: Wallet, trade: SellTradeCreationDto): Promise<TransactionReceipt> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }
}
