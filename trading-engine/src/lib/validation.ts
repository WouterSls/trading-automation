import { TradeCreationDto } from "../trading/types/_index";
import { ValidationError } from "./errors";

export { validateNetwork } from "./utils";

export function validateTrade(tradeRequest: TradeCreationDto) {
  const inputAmountNumber = Number(tradeRequest.inputAmount);

  if (isNaN(inputAmountNumber)) {
    throw new ValidationError("Input Amount is not a valid number");
  }

  if (inputAmountNumber < 0) {
    throw new ValidationError("Input Amount must be greater than zero");
  }
}
