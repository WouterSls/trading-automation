export interface TokenPriceResponse {
  data: TokenPriceResponseData;
}

export interface TokenPriceResponseData {
  id: string;
  type: string;
  attributes: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    image_url: string;
    coingecko_coin_id: string;
    total_supply: string;
    price_usd: string;
    fdv_usd: string;
    total_reserve_in_usd: string;
    volume_usd: {
      h24: string;
    };
    market_cap_usd: string;
  };
  relationships: {
    top_pools: {
      data: {
        id: string;
        type: string;
      };
    };
  };
}

export interface NewPoolsResponse {
  data: NewPoolsResponseData[];
}

export interface NewPoolsResponseData {
  id: string;
  type: string;
  attributes: {
    name: string;
    address: string;
    base_token_price_usd: string;
    quote_token_price_usd: string;
    base_token_price_native_currency: string;
    quote_token_price_native_currency: string;
    base_token_price_quote_token: string;
    quote_token_price_base_token: string;
    pool_created_at: string;
    reserve_in_usd: string;
    fdv_usd: string;
    market_cap_usd: string;
    price_change_percentage: {};
    transactions: {};
    volume_usd: {};
  };
  relationships: {};
}
