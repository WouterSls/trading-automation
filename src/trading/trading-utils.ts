import { ethers } from "ethers";
import { InputType, TradeCreationDto, TradeType } from "./types/_index";
import { TRADING_CONFIG } from "../config/trading-config";

export function determineTradeType(trade: TradeCreationDto): TradeType {
  const isTokenInput = trade.inputType === InputType.TOKEN && trade.inputToken !== ethers.ZeroAddress;
  const isEthInput = trade.inputType === InputType.ETH && trade.inputToken === ethers.ZeroAddress;
  const isUsdInput = trade.inputType === InputType.USD && trade.inputToken === ethers.ZeroAddress;
  const isTokenOutput = trade.outputToken !== ethers.ZeroAddress;
  const isEthOutput = trade.outputToken === ethers.ZeroAddress;

  if ((isEthInput || isUsdInput) && isTokenOutput) {
    return TradeType.ETHInputTOKENOutput;
  }

  if (isTokenInput && isEthOutput) {
    return TradeType.TOKENInputETHOutput;
  }

  if (isTokenInput && isTokenOutput) {
    return TradeType.TOKENInputTOKENOutput;
  }

  if ((isEthInput || isUsdInput) && isEthOutput) {
    throw new Error("Can't trade ETH -> ETH");
  }

  throw new Error("Unknown trade type for given TradeCreationDto");
}

export function calculatePriceImpact(expectedOutput: bigint, actualOutput: bigint) {
  if (expectedOutput === 0n) {
    return 0n;
  }

  return ((expectedOutput - actualOutput) / expectedOutput) * 100n;
}

export function calculateSlippageAmount(actualOutput: bigint) {
  return (actualOutput * BigInt(TRADING_CONFIG.SLIPPAGE_TOLERANCE * 100)) / 100n;
}