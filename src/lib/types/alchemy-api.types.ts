export interface TokenAddressInput {
  network: string;
  address: string;
}

export interface TokenPriceRequestBody {
  addresses: TokenAddressInput[];
}

export interface PriceInfo {
  currency: string;
  value: string;
  lastUpdatedAt: string;
}

export interface TokenPriceData {
  symbol: string;
  prices: PriceInfo[];
  error: string | null;
}

export interface TokenPriceResponse {
  data: TokenPriceData[];
}