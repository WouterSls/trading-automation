import { Wallet } from "ethers";
import { ChainType } from "../../config/chain-config";
import { ERC20 } from "../ERC/ERC20";
import { BuyTrade } from "./trades/BuyTrade";

export interface ITradingStrategy {
  /**
   * Getters
   */
  getName(): string;
  getChain(): ChainType;
  getETHLiquidity(wallet: Wallet, tokenAddress: string): Promise<string>;
  getUsdcPrice(wallet: Wallet, tokenAddress: string): Promise<string>;
  /**
   * Buy
   */
  buy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<BuyTrade>;
  simulateBuy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<boolean>;
}
