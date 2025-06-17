import { ChainType } from "../../../../config/chain-config";
import { InputType, OutputType } from "../_index";

export type BuyTradeCreationDto = {
  tradeType: "BUY";
  chain: ChainType;
  inputType: InputType;
  inputToken: string;
  inputAmount: string;
  outputToken: string;
};
