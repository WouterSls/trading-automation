import { ChainType } from "../../../config/chain-config";
import { InputType } from "../trading-types";

export type TradeCreationDto = {
  chain: ChainType;
  inputType: InputType;
  inputToken: string;
  inputAmount: string;
  outputToken: string;
  sellPrice?: string;
};
