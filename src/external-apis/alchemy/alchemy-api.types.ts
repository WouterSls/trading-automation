export enum NetworkEnum {
  ETH = "eth-mainnet",
  BASE = "base-mainnet",
  ARBITRUM = "arbitrum-mainnet",
  APE = "apechain-mainnet",
}

type BasePriceData = {
  prices: PriceInfo[];
  error: string | null;
};
interface PriceInfo {
  currency: string;
  value: string;
  lastUpdatedAt: string;
}
export interface AddressPriceData extends BasePriceData {
  address: string | null;
  network: string | null;
}
export interface SymbolPriceData extends BasePriceData {
  symbol: string | null;
}
export type PriceData = AddressPriceData | SymbolPriceData;

export interface PriceDataRequestBody {
  addresses: { network: NetworkEnum; address: string }[];
}
export interface PriceDataResponse {
  data: PriceData[];
}

export interface TokenDataResponse {
  data: TokenData[];
}
interface TokenData {
  address: string;
  network: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface PriceRequest {
  network: NetworkEnum;
  address: string;
}
