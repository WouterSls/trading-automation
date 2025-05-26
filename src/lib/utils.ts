import { ethers, Wallet } from "ethers";

import { ERC20_INTERFACE, WETH_INTERFACE } from "./contract-abis/erc20";
import { ChainType, mapNetworkNameToChainType } from "../config/chain-config";
import { POOL_INTERFACE as V3_POOL_INTERFACE } from "./contract-abis/uniswap-v3";
import { UNISWAP_V2_PAIR_INTERFACE } from "./contract-abis/uniswap-v2";
import { calculatePriceFromSqrtPriceX96 } from "../models/blockchain/uniswap-v3/uniswap-v3-utils";

export async function validateNetwork(wallet: Wallet, chainType: ChainType) {
  try {
    const network = await wallet.provider!.getNetwork();
    const chain = mapNetworkNameToChainType(network.name);
    if (chain !== chainType) {
      throw new Error(`Wallet on different chain`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error has occurred";
    if (errorMessage.toLowerCase().includes("wallet on different chain")) {
      throw error;
    }
    throw new Error("Network Validation Failed");
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
        });
      } else if (log.topics[0] === WETH_INTERFACE.getEvent("Withdrawal")!.topicHash) {
        const decoded = WETH_INTERFACE.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (!decoded) throw new Error("Failed to decode WETH Withdrawal");

        decodedLogs.push({
          type: "WETH Withdrawal",
          contract: log.address,
          src: decoded.args.src,
          wad: decoded.args.wad,
        });
      } else if (log.topics[0] === WETH_INTERFACE.getEvent("Deposit")!.topicHash) {
        const decoded = WETH_INTERFACE.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (!decoded) throw new Error("Failed to decode WETH Deposit");

        decodedLogs.push({
          type: "WETH Deposit",
          contract: log.address,
          dst: decoded.args.dst,
          wad: decoded.args.wad,
        });
      } else if (log.topics[0] === UNISWAP_V2_PAIR_INTERFACE.getEvent("Swap")!.topicHash) {
        const decoded = UNISWAP_V2_PAIR_INTERFACE.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (!decoded) throw new Error("Failed to decode Uniswap V2 Swap");

        decodedLogs.push({
          type: "Uniswap V2 Swap",
          pair: log.address,
          sender: decoded.args.sender,
          to: decoded.args.to,
          amount0In: decoded.args.amount0In,
          amount1In: decoded.args.amount1In,
          amount0Out: decoded.args.amount0Out,
          amount1Out: decoded.args.amount1Out,
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
      } else {
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
