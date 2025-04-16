import { TransactionReceipt, TransactionRequest, Wallet } from "ethers";
import { ChainType } from "../../../lib/types/trading.types";

import { ERC20 } from "../../ERC/ERC20";
import { AbstractTradingStrategy } from "./AbstractTradingStrategy";
import { BuyTrade } from "../trades/BuyTrade";

export class UniswapV3Strategy extends AbstractTradingStrategy {
  constructor(STRATEGY_NAME: string, chain: ChainType) {
    super(STRATEGY_NAME, chain);
  }

  async getETHLiquidity(wallet: Wallet): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      resolve("0");
    });
  }

  async buy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<BuyTrade> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }

  async simulateBuy(wallet: Wallet, token: ERC20, usdAmount: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      reject(new Error("Not implemented"));
    });
  }
}
