import { BasescanApi } from "../../src/external-apis/BasescanApi";

// Mock global fetch
global.fetch = jest.fn();

// Mock ethers Interface
jest.mock("ethers", () => {
  const original = jest.requireActual("ethers");
  return {
    ...original,
    Interface: jest.fn().mockImplementation(() => ({
      fragments: [
        { type: "function", name: "transfer" },
        { type: "function", name: "balanceOf" },
        { type: "event", name: "Transfer" },
      ],
    })),
  };
});

describe("BasescanApi", () => {
  let api: BasescanApi;
  const mockApiKey = "test-api-key";

  beforeEach(() => {
    jest.clearAllMocks();
    api = new BasescanApi(mockApiKey);
  });

  describe("getVerifiedAbi", () => {
    it("should return verified ABI data when contract is verified", async () => {
      // Sample ABI for a basic ERC20 token
      const sampleAbi = JSON.stringify([
        {
          constant: true,
          inputs: [{ name: "_owner", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "balance", type: "uint256" }],
          type: "function",
        },
        {
          constant: false,
          inputs: [
            { name: "_to", type: "address" },
            { name: "_value", type: "uint256" },
          ],
          name: "transfer",
          outputs: [{ name: "success", type: "bool" }],
          type: "function",
        },
      ]);

      // Mock successful API response for verified contract
      const mockResponse = {
        status: "1",
        message: "OK",
        result: sampleAbi,
      };

      // Setup fetch mock
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Call the method
      const result = await api.getVerifiedAbi("0xContractAddress");

      // Assertions
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("https://api.basescan.org/api?module=contract&action=getabi&address=0xContractAddress"),
      );
      expect(result.isVerified).toBe(true);
      expect(result.functionNames).toContain("transfer");
      expect(result.functionNames).toContain("balanceOf");
    });

    it("should return isVerified=false when contract is not verified", async () => {
      // Mock API response for unverified contract
      const mockResponse = {
        status: "0",
        message: "NOTOK",
        result: "Contract source code not verified",
      };

      // Setup fetch mock
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Call the method
      const result = await api.getVerifiedAbi("0xContractAddress");

      // Assertions
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result.isVerified).toBe(false);
      expect(result.contractAbi).toBe("");
      expect(result.functionNames).toEqual([]);
    });
  });

  describe("getContractCreator", () => {
    it("should return the contract creator address", async () => {
      // Mock successful API response
      const mockResponse = {
        status: "1",
        message: "OK",
        result: [
          {
            contractAddress: "0xContractAddress",
            contractCreator: "0xCreatorAddress",
            txHash: "0xTransactionHash",
          },
        ],
      };

      // Setup fetch mock
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Call the method
      const creatorAddress = await api.getContractCreator("0xContractAddress");

      // Assertions
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("https://api.basescan.org/api?module=contract&action=getcontractcreation"),
      );
      expect(creatorAddress).toBe("0xCreatorAddress");
    });

    it("should throw an error when API call fails", async () => {
      // Setup fetch mock to fail
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      // Mock console.log to prevent actual logging
      jest.spyOn(console, "log").mockImplementation();

      // Call the method and expect it to throw
      await expect(api.getContractCreator("0xContractAddress")).rejects.toThrow("Basescan NOK API response");
    });
  });
});
