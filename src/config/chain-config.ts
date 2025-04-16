import { ChainType } from "../lib/types/trading.types";

export const supportedChains: Record<ChainType, ChainConfig> = {
  [ChainType.ETH]: {
    id: 1n,
    name: "Ethereum Mainnet",
    nativeCurrency: "ETH",
    explorerUrl: "https://etherscan.io",
    supportedProtocols: ["uniV2", "uniV3"],
    uniswapV2: {
      factoryAddress: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
      routerAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    },
    uniswapV3: {
      factoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      quoterAddress: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      universalRouterAddress: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
    },
    permit2Address: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    tokenAddresses: {
      weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    },
  },
  [ChainType.ARB]: {
    id: 42161n,
    name: "Arbitrum One",
    nativeCurrency: "ETH",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    supportedProtocols: ["uniV2", "uniV3"],
    uniswapV2: {
      factoryAddress: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
      routerAddress: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    },
    uniswapV3: {
      factoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      quoterAddress: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      universalRouterAddress: "0x5E325eDA8064b456f4781070C0738d849c824258",
    },
    tokenAddresses: {
      weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      usdc: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    },
  },
  [ChainType.BASE]: {
    id: 8453n,
    name: "Base",
    nativeCurrency: "ETH",
    explorerUrl: "https://basescan.org",
    supportedProtocols: ["uniV2", "uniV3", "velo"],
    uniswapV2: {
      factoryAddress: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
      routerAddress: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24",
    },
    uniswapV3: {
      factoryAddress: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
      quoterAddress: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
      universalRouterAddress: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
    },
    tokenAddresses: {
      weth: "0x4200000000000000000000000000000000000006",
      usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    },
  },
};

export interface ChainConfig {
  id: bigint;
  name: string;
  nativeCurrency: string;
  rpcUrl?: string;
  explorerUrl?: string;
  supportedProtocols: ("uniV2" | "uniV3" | "velo" | "balancer")[];
  tokenAddresses: {
    weth: string;
    usdc?: string;
  };
  uniswapV2: {
    factoryAddress: string;
    routerAddress: string;
  };
  uniswapV3: {
    factoryAddress: string;
    quoterAddress: string;
    universalRouterAddress: string;
  };
  permit2Address?: string;
  velo?: {};
}

/**
 * Gets the chain config for a given chain type
 * @param chain The chain type
 * @returns The corresponding ChainConfig
 */
export function getChainConfig(chain: ChainType): ChainConfig {
  try {
    const chainConfig = supportedChains[chain];
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    return chainConfig;
  } catch (error) {
    console.error("Error getting chain configuration: ", error);
    throw new Error(`Error getting chain configuration`);
  }
}

/**
 * Maps a network name from ethers provider to a ChainType
 * @param networkName The network name from ethers provider
 * @returns The corresponding ChainType or undefined if not found
 */
export function mapNetworkNameToChainType(networkName: string): ChainType | undefined {
  const ETH_NETWORK_NAMES = ["homestead", "mainnet", "ethereum", "eth"];
  const ARB_NETWORK_NAMES = ["arbitrum", "arbitrum one"];
  const BASE_NETWORK_NAMES = ["base"];

  const networkNameLower = networkName.toLowerCase();

  if (ETH_NETWORK_NAMES.includes(networkNameLower)) {
    return ChainType.ETH;
  } else if (ARB_NETWORK_NAMES.includes(networkNameLower)) {
    return ChainType.ARB;
  } else if (BASE_NETWORK_NAMES.includes(networkNameLower)) {
    return ChainType.BASE;
  }

  return undefined;
}
