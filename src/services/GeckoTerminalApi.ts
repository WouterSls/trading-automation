import { ChainType } from "../config/chain-config";
import { NewPoolsResponse, TokenPriceResponse } from "../lib/types/geckoterminal-api.types";

export class GeckoTerminalApi {
  private readonly BASE_URL = "https://api.geckoterminal.com/api/v2";

  private readonly JSON_HEADER = {
    Accept: "application/json",
  };

  constructor() {}

  /**
   *
   * @token
   */
  async getTokenPriceData(chain: ChainType, tokenAddress: string) {
    const url = `${this.BASE_URL}/networks/${chain}/tokens/${tokenAddress}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.JSON_HEADER,
    });

    if (!response.ok) {
      console.error(`Error fetching token price: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: TokenPriceResponse = await response.json();

    return data.data;
  }
  async getTokenUsdPrice(chain: ChainType, tokenAddress: string) {
    const url = `${this.BASE_URL}/networks/${chain}/tokens/${tokenAddress}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.JSON_HEADER,
    });

    if (!response.ok) {
      console.error(`Error fetching token price: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: TokenPriceResponse = await response.json();

    return data.data.attributes.price_usd;
  }

  /**
   *
   * @pools
   */
  async getNewPools(chain: ChainType) {
    const url = `${this.BASE_URL}/networks/${chain}/new_pools`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.JSON_HEADER,
    });

    if (!response.ok) {
      console.log(response);
      throw new Error("Basescan NOK API response");
    }

    const data: NewPoolsResponse = await response.json();
    console.log(JSON.stringify(data, null, 2));
    return data;
  }
}
