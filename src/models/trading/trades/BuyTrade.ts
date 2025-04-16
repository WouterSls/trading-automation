import { BaseTrade } from "./AbstractBaseTrade";

export class BuyTrade extends BaseTrade {
  constructor(
    transactionHash: string,
    confirmedBlock: number,
    gasCost: string,
    tokenPriceUsd: string,
    ethPriceUsd: string,
    private rawTokensReceived: string,
    private formattedTokensReceived: string,
    private ethSpent: string,
  ) {
    super(transactionHash, confirmedBlock, gasCost, tokenPriceUsd, ethPriceUsd);
  }

  getRawTokensReceived = (): string => this.rawTokensReceived;
  getFormattedTokensReceived = (): string => this.formattedTokensReceived;
  getEthSpent = (): string => this.ethSpent;
}
