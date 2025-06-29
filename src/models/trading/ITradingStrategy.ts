import { TransactionRequest, Wallet } from "ethers";
import { BuyTradeCreationDto, SellTradeCreationDto, Quote } from "./types/_index";
import { TradeCreationDto } from "./types/dto/TradeCreationDto";

export interface ITradingStrategy {
  getName(): string;
  getEthUsdcPrice(wallet: Wallet): Promise<string>;

  getBuyTradeQuote(wallet: Wallet, trade: BuyTradeCreationDto): Promise<Quote>;
  getSellTradeQuote(wallet: Wallet, trade: SellTradeCreationDto): Promise<Quote>;

  createBuyTransaction(wallet: Wallet, trade: BuyTradeCreationDto): Promise<TransactionRequest>;
  createSellTransaction(wallet: Wallet, trade: SellTradeCreationDto): Promise<TransactionRequest>;

  getTradeQuote(wallet: Wallet, trade: TradeCreationDto): Promise<Quote>;
  createTransaction(wallet: Wallet, trade: TradeCreationDto): Promise<TransactionRequest>;

  ensureTokenApproval(wallet: Wallet, tokenAddress: string, amount: string): Promise<string | null>;
}
