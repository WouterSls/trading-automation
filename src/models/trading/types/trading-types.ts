export enum InputType {
  ETH = "ETH",
  USD = "USD",
  TOKEN = "TOKEN",
}

export enum TradeType {
  ETHInputTOKENOutput = "1",
  TOKENInputTOKENOutput = "2",
  TOKENInputETHOutput = "3",
}

export interface TradeConfirmation {
    strategy: string,
    transactionHash: string,
    confirmedBlock: number,
    gasCost: string,
    tokenPriceUsd: string,
    ethPriceUsd: string,
    ethSpent: string,
    ethReceived: string,
    rawTokensSpent: string,
    rawTokensReceived: string,
    formattedTokensSpent: string,
    formattedTokensReceived: string,
}