import { TokenPriceData, TokenPriceResponse, TokenAddressInput, TokenPriceRequestBody } from "../lib/types/alchemy-api.types";

export class AlchemyApi {
  private readonly PRICES_API_URL: string = "https://api.g.alchemy.com/prices/v1";
  private readonly TOKEN_API_URL: string = "https://eth-mainnet.g.alchemy.com/v2";

  constructor(private readonly apiKey: string) {}

  async getEthUsdPrice(): Promise<TokenPriceData> {
    if (!this.apiKey) {
      throw new Error("Alchemy API key is not set");
    }
    const baseUrl = `${this.PRICES_API_URL}/${this.apiKey}/tokens/by-symbol`;
    const symbols = ["ETH"];
    const queryParams = new URLSearchParams({
      symbols: symbols.join(","),
    });
    const url = `${baseUrl}?${queryParams}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ETH price: ${response.statusText}`);
    }
    const tokenPriceResponse: TokenPriceResponse = await response.json();

    if (tokenPriceResponse.data.length === 0) {
      throw new Error("No ETH price data found");
    }

    const ethTokenPriceData = tokenPriceResponse.data[0];

    if (ethTokenPriceData.error) {
      throw new Error("ETH price data error");
    }

    if (ethTokenPriceData.symbol !== "ETH") {
      throw new Error("ETH price data error");
    }

    return ethTokenPriceData;
  }



  async getTokenPrices(addresses: TokenAddressInput[]): Promise<TokenPriceResponse> {

    const url = 'https://api.g.alchemy.com/prices/v1/docs-demo/tokens/by-address';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        addresses
      } as TokenPriceRequestBody)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token prices: ${response.statusText}`);
    }

    return response.json() as Promise<TokenPriceResponse>;
  }
}