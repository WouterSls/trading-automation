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
