export enum InputType {
  ETH = "ETH",
  USD = "USD",
  TOKEN = "TOKEN",
}

export enum OutputType {
  ETH = "ETH",
  TOKEN = "TOKEN",
}

export enum TradeType {
  ETHInputTOKENOutput = "1",
  TOKENInputTOKENOutput = "2",
  TOKENInputETHOutput = "3",
}

abstract class BaseTrade {
  constructor(
    private strategy: string,
    private transactionHash: string,
    private confirmedBlock: number,
    private gasCost: string,
    private tokenPriceUsd: string,
    private ethPriceUsd: string,
  ) {}

  /**
   * Getters
   */
  getStrategy = (): string => this.strategy;
  getTransactionHash = (): string => this.transactionHash;
  getConfirmedBlock = (): number => this.confirmedBlock;
  getGasCost = (): string => this.gasCost;
  getTokenPriceUsd = (): string => this.tokenPriceUsd;
  getEthPriceUsd = (): string => this.ethPriceUsd;
}

export class BuyTrade extends BaseTrade {
  constructor(
    dex: string,
    transactionHash: string,
    confirmedBlock: number,
    gasCost: string,
    tokenPriceUsd: string,
    ethPriceUsd: string,
    private rawTokensReceived: string,
    private formattedTokensReceived: string,
    private ethSpent: string,
  ) {
    super(dex, transactionHash, confirmedBlock, gasCost, tokenPriceUsd, ethPriceUsd);
  }

  getRawTokensReceived = (): string => this.rawTokensReceived;
  getFormattedTokensReceived = (): string => this.formattedTokensReceived;
  getEthSpent = (): string => this.ethSpent;
}

export class SellTrade extends BaseTrade {
  constructor(
    dex: string,
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
    super(dex, transactionHash, confirmedBlock, gasCost, tokenPriceUsd, ethPriceUsd);
  }

  getEthSpent = (): string => this.ethSpent;
  getRawTokensSpent = (): string => this.rawTokensSpent;
  getFormattedTokensSpent = (): string => this.formattedTokensSpent;
  getEthReceived = (): string => this.ethReceived;
  getRawTokensReceived = (): string => this.rawTokensReceived;
  getFormattedTokensReceived = (): string => this.formattedTokensReceived;
}
