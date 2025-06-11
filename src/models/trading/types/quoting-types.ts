export interface Quote {
  outputAmount: string;
  priceImpact: number;
  tradeInfo: TradeInfo;
  //gasEstimate: string;
  //confidence: number; // 0-1 based on liquidity depth
}

export interface TradeInfo {
  wethNeeded: boolean;
  route: string[];
  fee: number;
}
