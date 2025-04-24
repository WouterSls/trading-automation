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
        blockNumber: 22_332_168, // pin to a block for determinism & caching
      },
    },
  },
};
export default config;
