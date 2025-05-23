import { ethers, Provider, Wallet } from "ethers";

import { ERC20_INTERFACE } from "./contract-abis/erc20";
import { ERC20 } from "../models/blockchain/ERC/ERC20";
import { ChainType, mapNetworkNameToChainType } from "../config/chain-config";
import { POOL_INTERFACE as V3_POOL_INTERFACE } from "./contract-abis/uniswap-v3";
import { calculatePriceFromSqrtPriceX96 } from "../models/blockchain/uniswap-v3/uniswap-v3-utils";

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

export async function validateNetwork(wallet: Wallet, chainType: ChainType) {
  const network = await wallet.provider!.getNetwork();
  const chain = mapNetworkNameToChainType(network.name);
  if (chain !== chainType) {
    throw new Error(`Wallet and factory are on different networks`);
  }
}

export function decodeLogs(logs: ReadonlyArray<ethers.Log>) {
  const decodedLogs = [];

  for (const log of logs) {
    try {
      if (log.topics[0] === ERC20_INTERFACE.getEvent("Transfer")!.topicHash) {
        const decoded = ERC20_INTERFACE.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (!decoded) throw new Error("Failed to decode ERC20 Transfer");

        decodedLogs.push({
          type: "ERC20 Transfer",
          contract: log.address,
          from: decoded.args.from,
          to: decoded.args.to,
          amount: decoded.args.amount,
          formattedAmount: ethers.formatUnits(
            decoded.args.amount,
            log.address.toLowerCase() === "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" ? 6 : 18,
          ),
        });
      } else if (log.topics[0] === V3_POOL_INTERFACE.getEvent("Swap")!.topicHash) {
        const decoded = V3_POOL_INTERFACE.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (!decoded) throw new Error("Failed to decode Uniswap V3 Swap");

        const sqrtPriceX96 = decoded.args.sqrtPriceX96;
        const price = calculatePriceFromSqrtPriceX96(sqrtPriceX96);

        decodedLogs.push({
          type: "Uniswap V3 Swap",
          pool: log.address,
          sender: decoded.args.sender,
          recipient: decoded.args.recipient,
          amount0: decoded.args.amount0,
          amount1: decoded.args.amount1,
          sqrtPriceX96: sqrtPriceX96,
          price,
          liquidity: decoded.args.liquidity,
          tick: decoded.args.tick,
        });
      }
      //TODO: UNISWAP V2 PAIR ALSO HAS TRADE EVENT
      else {
        decodedLogs.push({
          type: "Unknown",
          address: log.address,
          topics: log.topics,
          data: log.data,
        });
      }
    } catch (error) {
      decodedLogs.push({
        type: "Error decoding",
        log,
        error,
      });
    }
  }

  return decodedLogs;
}
