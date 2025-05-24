import { BaseTrade } from "./AbstractBaseTrade";

export class SellTrade extends BaseTrade {
  constructor(
    transactionHash: string,
    confirmedBlock: number,
    gasCost: string,
    tokenPriceUsd: string,
    ethPriceUsd: string,
    private ethSpent: string,
    private rawTokensSpent: string,
    private formattedTokensSpent: string,
    private rawTokensReceived: string,
    private formattedTokensReceived: string,
    private ethReceived: string,
  ) {
    super(transactionHash, confirmedBlock, gasCost, tokenPriceUsd, ethPriceUsd);
  }

  getEthSpent = (): string => this.ethSpent;
  getRawTokensSpent = (): string => this.rawTokensSpent;
  getFormattedTokensSpent = (): string => this.formattedTokensSpent;
  getEthReceived = (): string => this.ethReceived;
  getRawTokensReceived = (): string => this.rawTokensReceived;
  getFormattedTokensReceived = (): string => this.formattedTokensReceived;
}
