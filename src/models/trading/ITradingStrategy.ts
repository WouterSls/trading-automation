import { TransactionRequest, Wallet } from "ethers";
import { BuyTradeCreationDto, SellTradeCreationDto, Quote } from "./types/_index";

export interface ITradingStrategy {
  getName(): string;
  getEthUsdcPrice(wallet: Wallet): Promise<string>;

  getBuyTradeQuote(wallet: Wallet, trade: BuyTradeCreationDto): Promise<Quote>;
  getSellTradeQuote(wallet: Wallet, trade: SellTradeCreationDto): Promise<Quote>;

  createBuyTransaction(wallet: Wallet, trade: BuyTradeCreationDto): Promise<TransactionRequest>;
  createSellTransaction(wallet: Wallet, trade: SellTradeCreationDto): Promise<TransactionRequest>;

  ensureTokenApproval(wallet: Wallet, tokenAddress: string, amount: string): Promise<string | null>;
}
