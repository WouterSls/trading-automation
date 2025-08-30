import { GeckoTerminalApi } from "../../src/services/GeckoTerminalApi";
import { ChainType } from "../../src/config/chain-config";

global.fetch = jest.fn();

describe("GeckoTerminalApi", () => {
  let api: GeckoTerminalApi;

  beforeEach(() => {
    jest.clearAllMocks();
    api = new GeckoTerminalApi();
  });

  describe("getTokenPriceData", () => {
    it("should fetch token price data successfully", async () => {
      //Create mock response
      const mockResponse = {
        data: {
          id: "ethereum/tokens/0xtoken",
          type: "token",
          attributes: {
            name: "Test Token",
            symbol: "TEST",
            price_usd: "123.45",
            volume_usd: {
              h24: "1000000",
            },
          },
        },
      };

      // Setup the fetch mock
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Call the method
      const result = await api.getTokenPriceData(ChainType.ETH, "0xtoken");

      // Assertions
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith("https://api.geckoterminal.com/api/v2/networks/eth/tokens/0xtoken", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should return null on API error", async () => {
      // Mock failed API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      // Mock console.error to prevent actual logging during tests
      jest.spyOn(console, "error").mockImplementation();

      // Call the method
      const result = await api.getTokenPriceData(ChainType.ETH, "0xtoken");

      // Assertions
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith("Error fetching token price: 404 Not Found");
      expect(result).toBeNull();
    });
  });

  describe("getTokenUsdPrice", () => {
    it("should return the price_usd value from the token data", async () => {
      //Create mock response
      const mockResponse = {
        data: {
          id: "ethereum/tokens/0xtoken",
          type: "token",
          attributes: {
            name: "Test Token",
            symbol: "TEST",
            price_usd: "123.45",
          },
        },
      };

      // Setup the fetch mock
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Call the method
      const result = await api.getTokenUsdPrice(ChainType.ETH, "0xtoken");

      // Assertions
      expect(result).toEqual("123.45");
    });
  });
});
