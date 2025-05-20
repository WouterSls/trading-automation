import { Wallet } from "ethers";
import { ChainType } from "../../config/chain-config";
import { ERC20 } from "../blockchain/ERC/ERC20";
import { BuyTrade, SellTrade, OutputToken } from "./types/_index";

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
  /**
   * Sell
   */
  sell(wallet: Wallet, token: ERC20, tokenAmount: number, outputToken: OutputToken): Promise<SellTrade>;
  simulateSell(wallet: Wallet, token: ERC20, tokenAmount: number): Promise<boolean>;
}
