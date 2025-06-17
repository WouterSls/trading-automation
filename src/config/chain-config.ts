import { ethers } from "ethers";

export enum ChainType {
  ETH = "ETH",
  ARB = "ARB",
  BASE = "BASE",
}

export interface ChainConfig {
  id: bigint;
  name: string;
  nativeCurrency: string;
  fallbackRpcUrl?: string;
  explorerUrl?: string;
  tokenAddresses: {
    weth: string;
    usdc: string;
    dai: string;
  };
  uniswap: {
    v2: {
      factoryAddress: string;
      routerAddress: string;
    };
    v3: {
      factoryAddress: string;
      quoterV2Address: string;
      tickLensAddress: string;
      swapRouterV2Address: string;
    };
    v4: {
      poolManagerAddress: string;
      positionManagerAddress: string;
      stateViewAddress: string;
      quoterAddress: string;
    };
    permit2Address: string;
    universalRouterAddress: string;
  };
  aerodrome: {
    poolFactoryAddress: string;
    routerAddress: string;
  };
  multicall3Address: string;
}

export const supportedChains: Record<ChainType, ChainConfig> = {
  [ChainType.ETH]: {
    id: 1n,
    name: "Ethereum Mainnet",
    nativeCurrency: "ETH",
    fallbackRpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo",
    explorerUrl: "https://etherscan.io",
    tokenAddresses: {
      weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      dai: "0x6b175474e89094c44da98b954eedeac495271d0f",
    },
    uniswap: {
      v2: {
        factoryAddress: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
        routerAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      },
      v3: {
        factoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        quoterV2Address: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
        tickLensAddress: "0xbfd8137f7d1516D3ea5cA83523914859ec47F573",
        swapRouterV2Address: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      },
      v4: {
        poolManagerAddress: "0x000000000004444c5dc75cB358380D2e3dE08A90",
        positionManagerAddress: "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e",
        quoterAddress: "0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203",
        stateViewAddress: "0x7ffe42c4a5deea5b0fec41c94c136cf115597227",
      },
      permit2Address: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
      universalRouterAddress: "0x66a9893cc07d91d95644aedd05d03f95e1dba8af",
    },
    aerodrome: {
      poolFactoryAddress: ethers.ZeroAddress,
      routerAddress: ethers.ZeroAddress,
    },
    multicall3Address: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },
  [ChainType.ARB]: {
    id: 42161n,
    name: "Arbitrum One",
    nativeCurrency: "ETH",
    fallbackRpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    tokenAddresses: {
      weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      dai: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    },
    uniswap: {
      v2: {
        factoryAddress: "0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9",
        routerAddress: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24",
      },
      v3: {
        factoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
        quoterV2Address: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
        tickLensAddress: "0xbfd8137f7d1516D3ea5cA83523914859ec47F573",
        swapRouterV2Address: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      },
      v4: {
        poolManagerAddress: "0x360e68faccca8ca495c1b759fd9eee466db9fb32",
        positionManagerAddress: "	0xd88f38f930b7952f2db2432cb002e7abbf3dd869",
        stateViewAddress: "0x76fd297e2d437cd7f76d50f01afe6160f86e9990",
        quoterAddress: "0x3972c00f7ed4885e145823eb7c655375d275a1c5",
      },
      permit2Address: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
      universalRouterAddress: "0xa51afafe0263b40edaef0df8781ea9aa03e381a3",
    },
    aerodrome: {
      poolFactoryAddress: ethers.ZeroAddress,
      routerAddress: ethers.ZeroAddress,
    },
    multicall3Address: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },
  [ChainType.BASE]: {
    id: 8453n,
    name: "Base",
    nativeCurrency: "ETH",
    fallbackRpcUrl: "https://base-mainnet.g.alchemy.com/v2/demo",
    explorerUrl: "https://basescan.org",
    tokenAddresses: {
      weth: "0x4200000000000000000000000000000000000006",
      usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      dai: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
    },
    uniswap: {
      v2: {
        factoryAddress: "0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6",
        routerAddress: "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24",
      },
      v3: {
        factoryAddress: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
        quoterV2Address: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
        tickLensAddress: "0x0CdeE061c75D43c82520eD998C23ac2991c9ac6d",
        swapRouterV2Address: "0x2626664c2603336E57B271c5C0b26F421741e481",
      },
      v4: {
        poolManagerAddress: "0x498581ff718922c3f8e6a244956af099b2652b2b",
        positionManagerAddress: "0x7c5f5a4bbd8fd63184577525326123b519429bdc",
        stateViewAddress: "0xa3c0c9b65bad0b08107aa264b0f3db444b867a71",
        quoterAddress: "0x0d5e0f971ed27fbff6c2837bf31316121532048d",
      },
      permit2Address: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
      universalRouterAddress: "0x6ff5693b99212da76ad316178a184ab56d299b43",
    },
    aerodrome: {
      poolFactoryAddress: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
      routerAddress: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
    },
    multicall3Address: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },
};

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
