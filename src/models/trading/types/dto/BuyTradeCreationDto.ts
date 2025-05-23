import { ChainType } from "../../../../config/chain-config";
import { InputType } from "../InputType";

export type BuyTradeCreationDto = {
  tradeType: "BUY";
  chain: ChainType;
  inputType: InputType;
  inputToken?: string;
  inputAmount: string;
  outputToken: string;
};
