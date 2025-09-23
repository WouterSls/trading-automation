import { TransactionRequest, Wallet } from "ethers";

import { ERC20_INTERFACE } from "./smartcontract-abis/erc20";
import { ChainType, mapNetworkNameToChainType } from "../config/chain-config";
import { TradeCreationDto } from "../trading/types/dto/TradeCreationDto";
import { TradeConfirmation } from "../trading/types/trading-types";
import { ValidationError } from "./errors";
import { getCoingeckoApi } from "../hooks/useSetup";
import { ERC20 } from "../smartcontracts/ERC/ERC20";

export async function validateNetwork(wallet: Wallet, chainType: ChainType) {
  try {
    const network = await wallet.provider!.getNetwork();
    const chain = mapNetworkNameToChainType(network.name);
    if (chain !== chainType) {
      throw new ValidationError(`Wallet on different chain`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error has occurred";
    if (errorMessage.toLowerCase().includes("wallet on different chain")) {
      throw error;
    }
    throw new ValidationError("Network Validation Failed");
  }
}

export { decodeLogs, decodeError } from "./decoding-utils";

export function displayTrade(trade: TradeCreationDto) {
  console.log("--------------------------------");
  console.log("Trade");
  console.log("--------------------------------");
  console.log("\tInput type:", trade.inputType);
  console.log("\tInput token: ", trade.inputToken);
  console.log("\tInput amount:", trade.inputAmount);
  console.log("\tOutput token:", trade.outputToken);
  console.log();
}

export function displayTradeConfirmation(tradeConfirmation: TradeConfirmation) {
  console.log("--------------------------------");
  console.log("Trade Confirmation");
  console.log("--------------------------------");
  console.log("\tStrategy", tradeConfirmation.quote.strategy);
  console.log("\tRoute: ", tradeConfirmation.quote.route.path);
  console.log("\tGas Spent:", tradeConfirmation.gasCost);
  console.log("\tETH Spent:", tradeConfirmation.ethSpentFormatted);
  console.log("\tETH Received:", tradeConfirmation.ethReceivedFormatted);
  console.log("\tTokens Spent:", tradeConfirmation.tokensSpentFormatted);
  console.log("\tTokens Received:", tradeConfirmation.tokensReceivedFormatted);
  console.log("\tTransaction Hash:", tradeConfirmation.transactionHash);
  console.log();
}

export async function displayTokenBalance(tokenAddress: string, wallet: Wallet) {
  const balanceOfTxData = await ERC20_INTERFACE.encodeFunctionData("balanceOf", [wallet.address]);
  const balanceOfTx: TransactionRequest = {
    to: tokenAddress,
    data: balanceOfTxData,
  };
  const result = await wallet.call(balanceOfTx);

  const rawResult = ERC20_INTERFACE.decodeFunctionResult("balanceOf", result);
  console.log(`\t${tokenAddress} | ${rawResult}`);
}

export async function displayLivePrice(chain: ChainType, token: ERC20) {
  const geckoTerminalApi = getCoingeckoApi();

  const liveUsdPrice = await geckoTerminalApi.getTokenUsdPrice(chain, token.getTokenAddress());
  console.log(`${token.getName()} | ${token.getTokenAddress()}`);
  console.log(`$${liveUsdPrice}`);
  console.log();
}
