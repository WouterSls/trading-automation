import { ethers, Provider, Wallet } from "ethers";

import { ERC20_INTERFACE } from "../contract-abis/erc20";
import { ERC20 } from "../models/Erc20";

export async function createMinimalErc20(address: string, provider: Provider): Promise<ERC20> {
  const contract = new ethers.Contract(address, ERC20_INTERFACE, provider);

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    contract.name().catch(() => "Not a token"),
    contract.symbol().catch(() => "Unknown"),
    contract.decimals().catch(() => 18),
    contract.totalSupply().catch(() => "0"),
  ]);

  if (name === "Not a token" || symbol === "Unknown" || totalSupply === "0") {
    throw new Error("Not an ERC20");
  }
  const numberDecimals = Number(decimals);

  return new ERC20(name, symbol, address, numberDecimals, totalSupply, contract);
}

export function extractRawTokenOutputFromLogs(logs: any, token: ERC20): bigint {
  const transferEvent = logs.find((log: any) => log.address.toLowerCase() === token.getTokenAddress().toLowerCase());
  const rawReceivedTokenAmount = transferEvent ? transferEvent.data : "Unknown";
  return rawReceivedTokenAmount;
}

export async function approveTokenSpending(wallet: Wallet, token: ERC20, spenderAddress: string, rawAmount: bigint) {
  const approveTxRequest = await token.createApproveTransaction(spenderAddress, rawAmount);
  const populatedApproveTransaction = await wallet.populateTransaction(approveTxRequest);
  const approveTxResponse = await wallet.sendTransaction(populatedApproveTransaction);
  const approveTxReceipt = await approveTxResponse.wait();

  if (!approveTxReceipt) throw new Error("Failed to approve token spending | no transaction receipt");
  const gasCost = approveTxReceipt.gasPrice * approveTxReceipt.gasUsed;

  const gasCostFormatted = ethers.formatEther(gasCost);
  return gasCostFormatted;
}

export function calculateSlippageAmount(rawAmount: bigint, slippageTolerance: number) {
  const slippageMultiplier = slippageTolerance * 100;
  const slippageAmount = (rawAmount * BigInt(slippageMultiplier)) / 100n;
  return slippageAmount;
}

export function encodePath(tokens: string[], fees: number[]): string {
  if (tokens.length <= 1 || tokens.length !== fees.length + 1) {
    throw new Error("Invalid tokens or fees length for path encoding");
  }

  let encoded = "0x";
  for (let i = 0; i < tokens.length - 1; i++) {
    encoded += tokens[i].slice(2);
    encoded += fees[i].toString(16).padStart(6, "0");
  }
  encoded += tokens[tokens.length - 1].slice(2);

  return encoded;
}
