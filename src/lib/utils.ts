import { ethers, Wallet } from "ethers";

import { ERC20_INTERFACE, WETH_INTERFACE } from "./smartcontract-abis/erc20";
import { ChainType, mapNetworkNameToChainType } from "../config/chain-config";
import { UNISWAP_V3_POOL_INTERFACE } from "./smartcontract-abis/uniswap-v3";
import { UNISWAP_V2_PAIR_INTERFACE } from "./smartcontract-abis/uniswap-v2";
import { calculatePriceFromSqrtPriceX96 } from "../smartcontracts/uniswap-v3/uniswap-v3-utils";
import { UNIVERSAL_ROUTER_INTERFACE } from "./smartcontract-abis/universal-router";
import { TradeCreationDto } from "../trading/types/dto/TradeCreationDto";
import { InputType, TradeType } from "../trading/types/trading-types";
import { TRADING_CONFIG } from "../config/trading-config";

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
      } else if (log.topics[0] === UNISWAP_V3_POOL_INTERFACE.getEvent("Swap")!.topicHash) {
        const decoded = UNISWAP_V3_POOL_INTERFACE.parseLog({
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

export function decodeError(errorData: string) {
  if (!errorData || errorData === "0x") {
    return {
      type: "No error data",
      selector: null,
      decoded: null,
    };
  }

  const selector = errorData.slice(0, 10);

  // List of interfaces to try decoding against
  const interfaces = [
    { name: "Universal Router", interface: UNIVERSAL_ROUTER_INTERFACE },
    { name: "ERC20", interface: ERC20_INTERFACE },
    { name: "WETH", interface: WETH_INTERFACE },
    { name: "Uniswap V3 Pool", interface: UNISWAP_V3_POOL_INTERFACE },
    { name: "Uniswap V2 Pair", interface: UNISWAP_V2_PAIR_INTERFACE },
  ];

  // Try to decode against each interface
  for (const { name, interface: contractInterface } of interfaces) {
    try {
      const decoded = contractInterface.parseError(errorData);
      if (decoded) {
        return {
          type: "Decoded",
          contract: name,
          selector,
          errorName: decoded.name,
          signature: decoded.signature,
          args: decoded.args,
          decoded,
        };
      }
    } catch (e) {
      // Interface doesn't have this error, continue to next
      continue;
    }
  }

  // If no interface could decode it, provide raw analysis
  return {
    type: "Unknown",
    selector,
    rawData: errorData,
    possibleParams: analyzeErrorParams(errorData),
  };
}

function analyzeErrorParams(errorData: string) {
  if (errorData.length <= 10) {
    return { analysis: "No parameters" };
  }

  const paramData = errorData.slice(10);
  const paramCount = paramData.length / 64;

  if (paramCount !== Math.floor(paramCount)) {
    return { analysis: "Invalid parameter length" };
  }

  const params = [];
  for (let i = 0; i < paramCount; i++) {
    const paramHex = paramData.slice(i * 64, (i + 1) * 64);
    const paramValue = BigInt("0x" + paramHex);

    // Try to interpret as address if it looks like one
    if (paramHex.startsWith("000000000000000000000000") && paramHex.length === 64) {
      const address = "0x" + paramHex.slice(24);
      params.push({
        index: i,
        hex: "0x" + paramHex,
        uint256: paramValue.toString(),
        possibleAddress: address,
        type: "address-like",
      });
    } else {
      params.push({
        index: i,
        hex: "0x" + paramHex,
        uint256: paramValue.toString(),
        type: "uint256",
      });
    }
  }

  return {
    analysis: `${paramCount} parameters detected`,
    parameters: params,
  };
}

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
