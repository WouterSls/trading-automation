export const supportedChains: Record<string, ChainConfig> = {
  BASE: {
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

export function getChainConfig(chainId: bigint): ChainConfig {
  try {
    const chainConfig = Object.values(supportedChains).find((config) => config.id === chainId);
    if (!chainConfig) {
      throw new Error(`Unsupported chainId: ${chainId}`);
    }

    return chainConfig;
  } catch (error) {
    console.error("Error getting chain configuration: ", error);
    throw new Error(`Error getting chain configuration`);
  }
}
