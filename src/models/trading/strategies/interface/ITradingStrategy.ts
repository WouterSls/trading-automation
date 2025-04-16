import { Wallet } from "ethers";
import { ChainType } from "../../../../lib/types/trading.types";
import { ERC20 } from "../../../ERC/ERC20";
import { BuyTrade } from "../../trades/BuyTrade";
import { SellTrade } from "../../trades/SellTrade";

export interface ITradingStrategy {
  /**
   * Getters
   */
  getName(): string;
  getChain(): ChainType;
  getETHLiquidity(wallet: Wallet, tokenAddress: string): Promise<string>;

  /**
   * Buy
   */
  buy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<BuyTrade>;
  simulateBuy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<boolean>;
}
