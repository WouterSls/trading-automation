import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ethers, JsonRpcProvider, Wallet } from "ethers";
import { ChainConfig, getChainConfig, ChainType } from "./chain-config";

import { AlchemyApi } from "../services/AlchemyApi";
import { GeckoTerminalApi } from "../services/GeckoTerminalApi";

export const TRADING_CONFIG = {
  USD_BUY_SIZE: 20,
  USD_TEST_SIZE: 0.01,
  PROFIT_MARGIN: 1.21,
  STOP_LOSS_MARGIN: 0.9,
  SLIPPAGE_TOLERANCE: 0.02,
  MAX_PRICE_IMPACT_PERCENTAGE: 5,
  TP1_POSITION_PERCENTAGE: 1,
  MAX_RETRIES: 3,
};

export const getBaseProvider = async (): Promise<JsonRpcProvider> => {
  const rpcUrl = process.env.BASE_RPC_URL;

  if (!rpcUrl) {
    throw new Error("RPC_URL must be set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return provider;
};
export const getBaseChainConfig = async (): Promise<ChainConfig> => {
  return getChainConfig(ChainType.BASE);
};

export const getBaseWallet_1 = async (): Promise<Wallet> => {
  const rpcUrl = process.env.BASE_RPC_URL;
  const privateKey = process.env.MS_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("RPC_URL and PRIVATE_KEY must be set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
};

export const getArbitrumWallet_1 = async (): Promise<Wallet> => {
  const rpcUrl = process.env.ARB_RPC_URL;
  const privateKey = process.env.MS_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("RPC_URL and PRIVATE_KEY must be set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
};

export const getAlchemyApi = async (): Promise<AlchemyApi> => {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    throw new Error("ALCHEMY_API_KEY must be set");
  }
  return new AlchemyApi(apiKey);
};

export const getCoingeckoApi = async (): Promise<GeckoTerminalApi> => {
  return new GeckoTerminalApi();
};
