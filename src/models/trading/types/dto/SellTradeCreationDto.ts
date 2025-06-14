import { ChainType } from "../../../../config/chain-config";
import { OutputType } from "../trading-types";

export type SellTradeCreationDto = {
  tradeType: "SELL";
  chain: ChainType;
  inputToken: string;
  inputAmount: string;
  outputType: OutputType;
  outputToken: string;
  tradingPointPrice: string;
};
