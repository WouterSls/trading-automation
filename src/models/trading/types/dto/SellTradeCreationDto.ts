import { ChainType } from "../../../../config/chain-config";
import { OutputType } from "../trading-types";

//TODO: remove output type and add check on token address
export type SellTradeCreationDto = {
  tradeType: "SELL";
  chain: ChainType;
  inputToken: string;
  inputAmount: string;
  outputType: OutputType;
  outputToken: string;
  tradingPointPrice: string;
};
