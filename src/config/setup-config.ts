import { ethers, JsonRpcProvider, Wallet } from "ethers";
import { ChainConfig, getChainConfig } from "./chain-config";
import dotenv from "dotenv";
import path from "path";
import { AlchemyApi } from "../services/AlchemyApi";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

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
  const BASE_CHAIN_ID = 8453n;
  return getChainConfig(BASE_CHAIN_ID);
};

export const getAlchemyApi = async (): Promise<AlchemyApi> => {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    throw new Error("ALCHEMY_API_KEY must be set");
  }
  return new AlchemyApi(apiKey);
};

export const getBaseWallet_1 = async (): Promise<Wallet> => {
  const rpcUrl = process.env.BASE_RPC_URL;
  const privateKey = process.env.MS_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("RPC_URL and PRIVATE_KEY must be set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return wallet;
};
