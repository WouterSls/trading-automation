import { HardhatUserConfig } from "hardhat/config";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const forkNetwork = process.env.FORK_NETWORK || "ethereum";

let networkConfig;
switch (forkNetwork) {
  case "base":
    networkConfig = {
      forking: {
        url: process.env.BASE_MAINNET_RPC_URL || process.env.BASE_RPC_URL!,
        blockNumber: 30_005_952,
      },
      chainId: 8453,
      chains: {
        8453: {
          hardforkHistory: {
            berlin: 0,
            london: 0,
            merge: 0,
            shanghai: 0,
            //cancun: 0,
            //prague: 0, | prague / electra -> pectra
          },
        },
      },
    };
    break;
  case "arbitrum":
    networkConfig = {
      forking: {
        url: process.env.ARB_RPC_URL!,
        blockNumber: 334_908_297,
      },
      chainId: 42161,
      chains: {
        42161: {
          hardforkHistory: {
            berlin: 0,
            london: 0,
            merge: 15537393,
            shanghai: 17034870,
            //TODO: blob-gas header issues introduced with cancun / prague hardforks
            //cancun: 19426589,
            //prague: 22431084,
          },
        },
      },
      initialBaseFeePerGas: 0, // disable EIP-1559 baseFee errors
    };
    break;
  default:
    networkConfig = {
      forking: {
        url: process.env.ETH_RPC_URL!,
        blockNumber: 22_344_527,
      },
      chainId: 1,
    };
    break;
}

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: networkConfig,
  },
  mocha: {
    timeout: 100000, // Longer timeout for fork tests
  },
};
export default config;
