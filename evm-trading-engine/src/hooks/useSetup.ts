import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const envPaths = [path.resolve(__dirname, "../../../.env"), path.resolve(__dirname, "../../.env")];

let envPath = envPaths.find((p) => fs.existsSync(p));

dotenv.config({ path: envPath });

import { ethers, JsonRpcProvider, Wallet } from "ethers";
import { ChainConfig, getChainConfig, ChainType } from "../config/chain-config";

import { AlchemyApi } from "../external-apis/alchemy/AlchemyApi";
import { GeckoTerminalApi } from "../external-apis/coingecko/GeckoTerminalApi";
import { TheGraphApi } from "../external-apis/thegraph/TheGraphApi";

//BASE
export const getBaseProvider = async (): Promise<JsonRpcProvider> => {
  const rpcUrl = process.env.BASE_RPC_URL;

  if (!rpcUrl) {
    throw new Error("RPC_URL must be set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return provider;
};
export const getBaseChainConfig = (): ChainConfig => {
  return getChainConfig(ChainType.BASE);
};

export const getBaseWallet_1 = (): Wallet => {
  const rpcUrl = process.env.BASE_RPC_URL;
  const privateKey = process.env.MS_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("RPC_URL and PRIVATE_KEY must be set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
};

//ARB
export const getArbitrumWallet_1 = (): Wallet => {
  const rpcUrl = process.env.ARB_RPC_URL;
  const privateKey = process.env.MS_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("RPC_URL and PRIVATE_KEY must be set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
};

//ETH
export const getEthWallet_1 = (): Wallet => {
  const rpcUrl = process.env.ETH_RPC_URL;
  const privateKey = process.env.MS_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("RPC_URL and PRIVATE_KEY must be set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
};

//TESTING
export const getHardhatWallet_1 = (): Wallet => {
  const rpcUrl = process.env.HARDHAT_RPC_URL;
  const privateKey = process.env.HARDHAT_PRIVATE_KEY_1;

  if (!rpcUrl || !privateKey) {
    throw new Error("RPC_URL and PRIVATE_KEY must be set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
};
export const getHardhatWallet_2 = (): Wallet => {
  const rpcUrl = process.env.HARDHAT_RPC_URL;
  const privateKey = process.env.HARDHAT_PRIVATE_KEY_2;

  if (!rpcUrl || !privateKey) {
    throw new Error("RPC_URL and PRIVATE_KEY must be set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
};
export const getHardhatWallet_3 = (): Wallet => {
  const rpcUrl = process.env.HARDHAT_RPC_URL;
  const privateKey = process.env.HARDHAT_PRIVATE_KEY_3;

  if (!rpcUrl || !privateKey) {
    throw new Error("RPC_URL and PRIVATE_KEY must be set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
};

export const getOfflineSigner_1 = (): Wallet => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY must be set");
  }
  const wallet = new ethers.Wallet(privateKey);
  return wallet;
};

//API
export const getAlchemyApi = (): AlchemyApi => {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    throw new Error("ALCHEMY_API_KEY must be set");
  }
  return new AlchemyApi(apiKey);
};
export const getCoingeckoApi = (): GeckoTerminalApi => {
  return new GeckoTerminalApi();
};
export const getTheGraphApi = (): TheGraphApi => {
  const apiKey = process.env.THE_GRAPH_API_KEY;
  if (!apiKey) {
    throw new Error("THE_GRAPH_API_KEY must be set");
  }
  return new TheGraphApi(apiKey);
};
