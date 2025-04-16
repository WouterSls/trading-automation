import { BaseTrade } from "./AbstractBaseTrade";

export class SellTrade extends BaseTrade {
  constructor(
    transactionHash: string,
    confirmedBlock: number,
    gasCost: string,
    tokenPriceUsd: string,
    ethPriceUsd: string,
    private rawTokensSpent: string,
    private formattedTokensSpent: string,
    private ethReceived: string,
  ) {
    super(transactionHash, confirmedBlock, gasCost, tokenPriceUsd, ethPriceUsd);
  }

  getRawTokensSpent = (): string => this.rawTokensSpent;
  getFormattedTokensSpent = (): string => this.formattedTokensSpent;
  getEthReceived = (): string => this.ethReceived;
}
