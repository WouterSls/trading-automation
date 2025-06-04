export interface TradeQuote {
  outputAmount: string;
  priceImpact: number;
  route: string[];
  //gasEstimate: string;
  //confidence: number; // 0-1 based on liquidity depth
}
