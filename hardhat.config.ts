import { HardhatUserConfig } from "hardhat/config";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 1,
      forking: {
        url: process.env.ETH_RPC_URL!, // e.g. Alchemy/Infura
        blockNumber: 22_344_527, // pin to a block for determinism & caching
      },
    },
    hardhat_arb: {
      chainId: 42161,
      url: process.env.ARB_RPC_URL!,
      forking: {
        url: process.env.ARB_RPC_URL!,
        blockNumber: 334_908_297,
      },
    },
    hardhat_base: {
      chainId: 8453,
      url: process.env.BASE_RPC_URL!,
      forking: {
        url: process.env.BASE_RPC_URL!,
        blockNumber: 30_005_952,
      },
    },
  },
  mocha: {
    timeout: 100000, // Longer timeout for fork tests
  },
};
export default config;
