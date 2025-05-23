import { ChainType } from "../../../../config/chain-config";
import { OutputToken } from "../OutputToken";

export type SellTradeCreationDto = {
  tradeType: "SELL";
  chain: ChainType;
  inputToken: string;
  inputAmount: string;
  outputToken: OutputToken;
  tradingPointPrice: string;
};
