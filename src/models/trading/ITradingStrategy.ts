import { TransactionRequest, Wallet } from "ethers";
import { BuyTradeCreationDto, SellTradeCreationDto } from "../../api/trades/TradesController";

export interface ITradingStrategy {
  getName(): string;
  getEthUsdcPrice(wallet: Wallet): Promise<string>;
  getTokenEthLiquidity(wallet: Wallet, tokenAddress: string): Promise<string>;
  getTokenUsdcPrice(wallet: Wallet, tokenAddress: string): Promise<string>;

  createBuyTransaction(wallet: Wallet, trade: BuyTradeCreationDto): Promise<TransactionRequest>;
  createSellTransaction(wallet: Wallet, trade: SellTradeCreationDto): Promise<TransactionRequest>;
}
