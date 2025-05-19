export interface TradeRoute {
  from: string;
  to: string;
  stable: boolean;
  factory: string;
}

export interface ExactETHForTokensParams {
  amountOutMin: bigint;
  routes: TradeRoute[];
  to: string;
  deadline: number;
}
