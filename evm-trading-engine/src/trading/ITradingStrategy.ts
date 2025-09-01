import { TransactionRequest, Wallet } from "ethers";
import { Quote, TradeCreationDto } from "./types/_index";

export interface ITradingStrategy {
  getName(): string;
  getEthUsdcPrice(wallet: Wallet): Promise<string>;

  ensureTokenApproval(tokenAddress: string, amount: string, wallet: Wallet): Promise<string | null>;

  getQuote(trade: TradeCreationDto, wallet: Wallet): Promise<Quote>;
  createTransaction(trade: TradeCreationDto, wallet: Wallet): Promise<TransactionRequest>;
}
