import { Wallet } from "ethers";
import { ChainType } from "../../../config/chain-config";
import { ITradingStrategy } from "./interface/ITradingStrategy";
import { ERC20 } from "../../ERC/ERC20";
import { BuyTrade } from "../trades/BuyTrade";

export abstract class AbstractTradingStrategy implements ITradingStrategy {
  constructor(
    protected strategyName: string,
    protected chain: ChainType,
  ) {}

  /**
   * Getters
   */
  getChain = (): ChainType => this.chain;
  getName = (): string => this.strategyName;
  abstract getETHLiquidity(wallet: Wallet, tokenAddress: string): Promise<string>;

  /**
   * Buy
   */
  abstract buy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<BuyTrade>;
  abstract simulateBuy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<boolean>;
}
