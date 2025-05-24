import { TransactionReceipt, Wallet } from "ethers";
import { ChainType } from "../../../config/chain-config";
import { ITradingStrategy } from "../ITradingStrategy";
import { BuyTradeCreationDto, SellTradeCreationDto } from "../types/_index";
import { AerodromeRouter } from "../../blockchain/aerodrome/AerodromeRouter";
import { createMinimalErc20 } from "../../blockchain/ERC/erc-utils";
import { ethers } from "ethers";

export class AerodromeStrategy implements ITradingStrategy {
  private router: AerodromeRouter;

  constructor(
    private strategyName: string,
    private chain: ChainType,
  ) {
    this.router = new AerodromeRouter(chain);
  }

  getName = (): string => this.strategyName;
  getSpenderAddress = (): string => this.router.getRouterAddress();

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

  async ensureTokenApproval(wallet: Wallet, tokenAddress: string, amount: string): Promise<string | null> {
    const { ensureStandardApproval } = await import("../../../lib/approval-strategies");
    return await ensureStandardApproval(wallet, tokenAddress, amount, this.router.getRouterAddress());
  }
}
