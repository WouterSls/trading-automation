import { ChainType } from "../config/chain-config";

export class TheGraphApi {
  constructor(private readonly apiKey: string) {}

  /**
   *
   * @token
   */
  async getV4InitializeEvent(chain: ChainType, currency0: string, currency1: string) {
    let url = "";

    switch (chain) {
      case ChainType.ETH:
        url = "https://gateway.thegraph.com/api/subgraphs/id/DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G";
        break;
      case ChainType.ARB:
        url = "https://gateway.thegraph.com/api/subgraphs/id/G5TsTKNi8yhPSV7kycaE23oWbqv9zzNqR49FoEQjzq1r";
        break;
      case ChainType.BASE:
        url = "https://gateway.thegraph.com/api/subgraphs/id/HNCFA9TyBqpo5qpe6QreQABAA1kV8g46mhkCcicu6v2R";
        break;
      default:
        throw new Error("Unsupported chain");
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      console.error(`Error fetching token price: ${response.status} ${response.statusText}`);
      return null;
    }

    //const data: TokenPriceResponse = await response.json();
    const data = await response.json();

    return data.data;
  }
}
