import { ethers } from "ethers";

import { GetAbiResponseData, GetAbiResult, GetContractCreationResponseData } from "../lib/types/basescan-api.types";

export class BasescanApi {
  // API
  private readonly BASE_URL = "https://api.basescan.org/api";

  // Responses
  private readonly VERIFIED_STATUS = "1";
  private readonly NOT_VERIFIED_STATUS = "0";
  private readonly NOT_VERIFIED_MESSAGE = "Contract source code not verified";

  constructor(private apiKey: string) {}

  /**
   *
   * @abi
   */
  async getVerifiedAbi(contractAddress: string) {
    const params = new URLSearchParams({
      module: "contract",
      action: "getabi",
      address: contractAddress,
      apikey: this.apiKey,
    });
    const getAbiEndpoint = `${this.BASE_URL}?${params}`;
    const response = await fetch(getAbiEndpoint);
    if (!response.ok) {
      console.log(response);
      throw new Error("Basescan NOK API response");
    }
    const data: GetAbiResponseData = await response.json();

    const isVerified = data.status === this.VERIFIED_STATUS && data.result !== this.NOT_VERIFIED_MESSAGE;

    if (!isVerified) {
      return { isVerified: false, contractAbi: "", functionNames: [] };
    }

    const contractAbi = isVerified ? JSON.parse(data.result) : "";
    const abiInterface = new ethers.Interface(contractAbi);

    const fragments = abiInterface.fragments;
    const functionFragments = fragments.filter((fragment: any) => fragment.type === "function");
    const functionNames = functionFragments.map((fragment: any) => fragment.name);

    const result: GetAbiResult = {
      isVerified,
      contractAbi,
      functionNames,
    };

    return result;
  }

  /**
   *
   * @contractCreator
   */
  async getContractCreator(contractAddress: string): Promise<string> {
    const params = new URLSearchParams({
      module: "contract",
      action: "getcontractcreation",
      contractaddresses: contractAddress,
      apikey: this.apiKey,
    });

    const endpoint = `${this.BASE_URL}?${params}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      console.log(response);
      throw new Error("Basescan NOK API response");
    }

    const data: GetContractCreationResponseData = await response.json();

    return data.result[0].contractCreator;
  }
}
