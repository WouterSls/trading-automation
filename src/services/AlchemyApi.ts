import {
  PriceDataResponse,
  NetworkEnum,
  PriceDataRequestBody,
  PriceData,
  AddressPriceData,
  SymbolPriceData,
  PriceRequest,
} from "./types/alchemy-api.types";

export class AlchemyApi {
  private readonly PRICES_API_URL: string = "https://api.g.alchemy.com/prices/v1";
  private readonly TOKEN_API_URL: string = "https://eth-mainnet.g.alchemy.com/v2";

  constructor(private readonly apiKey: string) {}

  /**
   *
   * @prices
   */
  async getEthUsdPrice(): Promise<SymbolPriceData> {
    if (!this.apiKey) {
      throw new Error("Alchemy API key is not set");
    }
    const baseUrl = `${this.PRICES_API_URL}/${this.apiKey}/tokens/by-symbol`;
    const queryParams = new URLSearchParams({
      symbols: "ETH",
    });

    const url = `${baseUrl}?${queryParams}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ETH price: ${response.statusText}`);
    }
    const priceDataResponse: PriceDataResponse = await response.json();

    if (priceDataResponse.data.length === 0) {
      throw new Error("No ETH price data found");
    }

    const ethTokenPriceData: PriceData = priceDataResponse.data[0];

    if (!this.isSymbolPriceData(ethTokenPriceData)) {
      throw new Error("ETH price data error");
    }

    if (ethTokenPriceData.error) {
      throw new Error("ETH price data error");
    }

    if (ethTokenPriceData.symbol !== "ETH") {
      throw new Error("ETH price data error");
    }

    return ethTokenPriceData;
  }

  /**
   *
   * @token
   */
  async getTokenPrice(network: NetworkEnum, address: string): Promise<AddressPriceData> {
    if (!this.apiKey) {
      throw new Error("Alchemy API key is not set");
    }

    const baseUrl = `${this.PRICES_API_URL}/${this.apiKey}/tokens/by-address`;
    const tokenRequest = { network: network, address: address };

    const body: PriceDataRequestBody = {
      addresses: [tokenRequest],
    };

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token prices: ${response.statusText}`);
    }

    const data: PriceDataResponse = await response.json();

    if (data.data.length === 0) {
      throw new Error("No token price data found");
    }

    const tokenPriceData: PriceData = data.data[0];

    if (!this.isAddressPriceData(tokenPriceData)) {
      throw new Error("Token price data error");
    }

    if (tokenPriceData.error) {
      throw new Error("Token price data error");
    }

    return tokenPriceData;
  }
  async getTokenPrices(requests: PriceRequest[]): Promise<AddressPriceData[]> {
    if (!this.apiKey) {
      throw new Error("Alchemy API key is not set");
    }

    const baseUrl = `${this.PRICES_API_URL}/${this.apiKey}/tokens/by-address`;

    const body: PriceDataRequestBody = { addresses: [] };

    for (const request of requests) {
      body.addresses.push({ network: request.network, address: request.address });
    }

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token prices: ${response.statusText}`);
    }

    const data: PriceDataResponse = await response.json();

    if (data.data.length === 0) {
      throw new Error("No token price data found");
    }

    const prices: PriceData[] = data.data;
    const resultPrices: AddressPriceData[] = prices.filter((price) =>
      this.isAddressPriceData(price),
    ) as AddressPriceData[];

    return resultPrices;
  }

  /**
   *
   * @wallet
   */
  async getAllTokensOwnedByWallet(walletAddress: string): Promise<AddressPriceData[]> {
    if (!this.apiKey) {
      throw new Error("Alchemy API key is not set");
    }
    const baseUrl = `${this.TOKEN_API_URL}/${this.apiKey}`;

    const body = {
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getTokenBalances",
      params: [walletAddress],
    };

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(res);
      throw new Error(`Failed to fetch token balances: ${res.statusText}`);
    }

    const data = await res.json();
    // DEBUGGING LOG
    //console.log(data);
    const result = data.result;
    const token0 = result.tokenBalances[0];
    const tokensOwnedAmount = result.tokenBalances.length;

    return tokensOwnedAmount;
  }

  /**
   *
   * @private
   */
  private isAddressPriceData(priceData: PriceData): priceData is AddressPriceData {
    return "address" in priceData;
  }
  private isSymbolPriceData(priceData: PriceData): priceData is SymbolPriceData {
    return "symbol" in priceData;
  }
}
