export abstract class BaseTrade {
  constructor(
    public transactionHash: string,
    public confirmedBlock: number,
    public gasCost: string,
    public tokenPriceUsd: string,
    public ethPriceUsd: string,
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
