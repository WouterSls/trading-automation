export abstract class BaseTrade {
  constructor(
    private transactionHash: string,
    private confirmedBlock: number,
    private gasCost: string,
    private tokenPriceUsd: string,
    private ethPriceUsd: string,
  ) {}

  /**
   * Getters
   */
  getTransactionHash = (): string => this.transactionHash;
  getConfirmedBlock = (): number => this.confirmedBlock;
  getGasCost = (): string => this.gasCost;
  getTokenPriceUsd = (): string => this.tokenPriceUsd;
  getEthPriceUsd = (): string => this.ethPriceUsd;
}

export interface TradeSuccessInfo {
  transactionHash: string;
  confirmedBlock: number;
  rawTokensReceived?: string;
  rawTokensSpent?: string;
  formattedTokensReceived?: string;
  formattedTokensSpent?: string;
  ethSpent?: string;
  ethReceived?: string;
  gasCost: string;
  tokenPriceUsd: string;
  ethPriceUsd: string;
}
