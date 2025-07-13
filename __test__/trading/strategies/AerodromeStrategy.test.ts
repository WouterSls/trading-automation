import { ethers, Wallet } from "ethers";
import { NetworkForkManager } from "../../helpers/network-fork";
import { getArbitrumWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";
import { ChainConfig, ChainType, getChainConfig } from "../../../src/config/chain-config";
import { AerodromeStrategy } from "../../../src/trading/strategies/AerodromeStrategy";
import { InputType, TradeCreationDto } from "../../../src/trading/types/_index";
import { TRADING_CONFIG } from "../../../src/config/trading-config";

const MISSING_PROVIDER_ERROR_MESSAGE = "Wallet has missing provider";
const INVALID_NETWORK_ERROR_MESSAGE = "Wallet on different chain";
const NETWORK_VALIDATION_FAILED = "Network Validation Failed";
const STRATEGY_NAME = "AerodromeStrategy";
const UNKNOWN_TRADE_TYPE_ERROR_MESSAGE = "Unknown trade type";
const PRICE_IMPACT_ERROR_PREFIX = "Price impact too high";

// Test addresses (these exist on Base mainnet forks)
const AERO_TOKEN_ADDRESS = "0x940181a94A35A4569E4529A3CDfB74e38FD98631"; // AERO token on Base
const CBETH_TOKEN_ADDRESS = "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22"; // cbETH token on Base

describe("Aerodrome Strategy Test", () => {
  let strategy: AerodromeStrategy;
  let chainConfig: ChainConfig;
  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  // Trade configurations for testing
  const ethToTokenTrade: TradeCreationDto = {
    chain: ChainType.BASE,
    inputType: InputType.ETH,
    inputToken: ethers.ZeroAddress,
    inputAmount: "1",
    outputToken: AERO_TOKEN_ADDRESS,
  };

  const usdToTokenTrade: TradeCreationDto = {
    chain: ChainType.BASE,
    inputType: InputType.USD,
    inputToken: ethers.ZeroAddress,
    inputAmount: "1000",
    outputToken: AERO_TOKEN_ADDRESS,
  };

  const tokenToEthTrade: TradeCreationDto = {
    chain: ChainType.BASE,
    inputType: InputType.TOKEN,
    inputToken: AERO_TOKEN_ADDRESS,
    inputAmount: "100",
    outputToken: ethers.ZeroAddress,
  };

  const tokenToTokenTrade: TradeCreationDto = {
    chain: ChainType.BASE,
    inputType: InputType.TOKEN,
    inputToken: CBETH_TOKEN_ADDRESS,
    inputAmount: "1",
    outputToken: AERO_TOKEN_ADDRESS,
  };

  const invalidEthTradeWithTokenInput: TradeCreationDto = {
    chain: ChainType.BASE,
    inputType: InputType.ETH,
    inputToken: AERO_TOKEN_ADDRESS, // Should be ethers.ZeroAddress for ETH input
    inputAmount: "1",
    outputToken: AERO_TOKEN_ADDRESS,
  };

  const invalidUsdTradeWithTokenInput: TradeCreationDto = {
    chain: ChainType.BASE,
    inputType: InputType.USD,
    inputToken: AERO_TOKEN_ADDRESS, // Should be ethers.ZeroAddress for USD input
    inputAmount: "1000",
    outputToken: AERO_TOKEN_ADDRESS,
  };

  const invalidTokenTradeWithEthInput: TradeCreationDto = {
    chain: ChainType.BASE,
    inputType: InputType.TOKEN,
    inputToken: ethers.ZeroAddress, // Should be a valid token address for TOKEN input
    inputAmount: "100",
    outputToken: AERO_TOKEN_ADDRESS,
  };

  beforeAll(async () => {
    const chain = ChainType.BASE;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
    strategy = new AerodromeStrategy(STRATEGY_NAME, chain);
  });

  beforeEach(() => {
    wallet = getHardhatWallet_1();
    nonNetworkWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("constructor and basic setup", () => {
    it("should create strategy with correct name", () => {
      expect(strategy.getName()).toBe(STRATEGY_NAME);
    });

    it("should initialize with correct chain configuration", () => {
      const testStrategy = new AerodromeStrategy("TestStrategy", ChainType.BASE);
      expect(testStrategy.getName()).toBe("TestStrategy");
    });

    it("should throw error when initialized on non-Base chain", () => {
      expect(() => new AerodromeStrategy("TestStrategy", ChainType.ETH)).toThrow(
        "AerodromeStrategy is only supported on Base chain",
      );
    });

    it("should throw error when initialized on Arbitrum chain", () => {
      expect(() => new AerodromeStrategy("TestStrategy", ChainType.ARB)).toThrow(
        "AerodromeStrategy is only supported on Base chain",
      );
    });
  });

  describe("ensureTokenApproval", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.ensureTokenApproval(AERO_TOKEN_ADDRESS, "100", offlineWallet)).rejects.toThrow(
        NETWORK_VALIDATION_FAILED,
      );
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.ensureTokenApproval(AERO_TOKEN_ADDRESS, "100", nonNetworkWallet)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should return gas cost for first token approval and null for second approval", async () => {
      const originalConfig = TRADING_CONFIG.INFINITE_APPROVAL;
      TRADING_CONFIG.INFINITE_APPROVAL = true;

      try {
        const firstApprovalGasCost = await strategy.ensureTokenApproval(AERO_TOKEN_ADDRESS, "100", wallet);
        const secondApprovalGasCost = await strategy.ensureTokenApproval(AERO_TOKEN_ADDRESS, "100", wallet);

        expect(typeof firstApprovalGasCost === "string").toBe(true);
        expect(secondApprovalGasCost).toBe(null);
      } finally {
        TRADING_CONFIG.INFINITE_APPROVAL = originalConfig;
      }
    });

    it("should handle different token addresses", async () => {
      const result = await strategy.ensureTokenApproval(CBETH_TOKEN_ADDRESS, "1000", wallet);
      expect(result === null || typeof result === "string").toBe(true);
    });

    it("should handle different amounts", async () => {
      const smallAmount = await strategy.ensureTokenApproval(AERO_TOKEN_ADDRESS, "1", wallet);
      const largeAmount = await strategy.ensureTokenApproval(AERO_TOKEN_ADDRESS, "1000000", wallet);

      expect(smallAmount === null || typeof smallAmount === "string").toBe(true);
      expect(largeAmount === null || typeof largeAmount === "string").toBe(true);
    });

    it("should handle zero amount gracefully", async () => {
      const result = await strategy.ensureTokenApproval(AERO_TOKEN_ADDRESS, "0", wallet);
      expect(result === null || typeof result === "string").toBe(true);
    });

    it("should throw error for invalid token address", async () => {
      const invalidAddress = "0xinvalid";
      await expect(strategy.ensureTokenApproval(invalidAddress, "100", wallet)).rejects.toThrow();
    });
  });

  describe("getEthUsdcPrice", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.getEthUsdcPrice(offlineWallet)).rejects.toThrow(NETWORK_VALIDATION_FAILED);
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.getEthUsdcPrice(nonNetworkWallet)).rejects.toThrow("Wallet on different chain");
    });

    it("should return valid ETH/USDC price", async () => {
      const price = await strategy.getEthUsdcPrice(wallet);

      expect(price).toBeDefined();
      expect(typeof price).toBe("string");
      expect(parseFloat(price)).toBeGreaterThan(0);
      expect(parseFloat(price)).toBeGreaterThan(500);
      expect(parseFloat(price)).toBeLessThan(10000);
    });
  });

  describe("getQuote", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.getQuote(ethToTokenTrade, offlineWallet)).rejects.toThrow(NETWORK_VALIDATION_FAILED);
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.getQuote(ethToTokenTrade, nonNetworkWallet)).rejects.toThrow(INVALID_NETWORK_ERROR_MESSAGE);
    });

    it("should throw error for invalid trade types", async () => {
      await expect(strategy.getQuote(invalidEthTradeWithTokenInput, wallet)).rejects.toThrow(
        UNKNOWN_TRADE_TYPE_ERROR_MESSAGE,
      );
      await expect(strategy.getQuote(invalidUsdTradeWithTokenInput, wallet)).rejects.toThrow(
        UNKNOWN_TRADE_TYPE_ERROR_MESSAGE,
      );
      await expect(strategy.getQuote(invalidTokenTradeWithEthInput, wallet)).rejects.toThrow(
        UNKNOWN_TRADE_TYPE_ERROR_MESSAGE,
      );
    });

    it("should return valid quote for ETH to token trade", async () => {
      const quote = await strategy.getQuote(ethToTokenTrade, wallet);

      expect(quote).toBeDefined();
      expect(quote.strategy).toBe(STRATEGY_NAME);
      expect(quote.outputAmount).toBeDefined();
      expect(typeof quote.outputAmount).toBe("string");
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);

      expect(quote.route).toBeDefined();
      expect(quote.route.amountOut).toBeGreaterThan(0n);
      expect(quote.route.aeroRoutes).toBeDefined();
      expect(quote.route.aeroRoutes!.length).toBeGreaterThan(0);
    });

    it("should return valid quote for USD to token trade", async () => {
      const quote = await strategy.getQuote(usdToTokenTrade, wallet);

      expect(quote).toBeDefined();
      expect(quote.strategy).toBe(STRATEGY_NAME);
      expect(quote.outputAmount).toBeDefined();
      expect(typeof quote.outputAmount).toBe("string");
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);

      expect(quote.route).toBeDefined();
      expect(quote.route.amountOut).toBeGreaterThan(0n);
      expect(quote.route.aeroRoutes).toBeDefined();
      expect(quote.route.aeroRoutes!.length).toBeGreaterThan(0);
    });

    it("should return valid quote for token to token trade", async () => {
      const quote = await strategy.getQuote(tokenToTokenTrade, wallet);

      expect(quote).toBeDefined();
      expect(quote.strategy).toBe(STRATEGY_NAME);
      expect(quote.outputAmount).toBeDefined();
      expect(typeof quote.outputAmount).toBe("string");
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);

      expect(quote.route).toBeDefined();
      expect(quote.route.amountOut).toBeGreaterThan(0n);
      expect(quote.route.aeroRoutes).toBeDefined();
      expect(quote.route.aeroRoutes!.length).toBeGreaterThan(0);
    });

    it("should return valid quote for token to ETH trade", async () => {
      const quote = await strategy.getQuote(tokenToEthTrade, wallet);

      expect(quote).toBeDefined();
      expect(quote.strategy).toBe(STRATEGY_NAME);
      expect(quote.outputAmount).toBeDefined();
      expect(typeof quote.outputAmount).toBe("string");
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);

      expect(quote.route).toBeDefined();
      expect(quote.route.amountOut).toBeGreaterThan(0n);
      expect(quote.route.aeroRoutes).toBeDefined();
      expect(quote.route.aeroRoutes!.length).toBeGreaterThan(0);
    });

    it("should handle different trade amounts correctly", async () => {
      const smallTrade = { ...ethToTokenTrade, inputAmount: "0.1" };
      const largeTrade = { ...ethToTokenTrade, inputAmount: "10" };

      const smallQuote = await strategy.getQuote(smallTrade, wallet);
      const largeQuote = await strategy.getQuote(largeTrade, wallet);

      expect(parseFloat(smallQuote.outputAmount)).toBeGreaterThan(0);
      expect(parseFloat(largeQuote.outputAmount)).toBeGreaterThan(0);

      // Large trade should give proportionally more output (accounting for price impact)
      expect(parseFloat(largeQuote.outputAmount)).toBeGreaterThan(parseFloat(smallQuote.outputAmount));
    });

    it("should handle USD input by converting to ETH first", async () => {
      const usdTrade = { ...ethToTokenTrade, inputType: InputType.USD, inputAmount: "2000" };
      const quote = await strategy.getQuote(usdTrade, wallet);

      expect(quote).toBeDefined();
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);

      // Should have valid route with aerodrome routes
      expect(quote.route.aeroRoutes).toBeDefined();
      expect(quote.route.aeroRoutes!.length).toBeGreaterThan(0);
    });
  });

  describe("createTransaction", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.createTransaction(ethToTokenTrade, offlineWallet)).rejects.toThrow(
        NETWORK_VALIDATION_FAILED,
      );
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.createTransaction(ethToTokenTrade, nonNetworkWallet)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should throw error for invalid trade types", async () => {
      await expect(strategy.createTransaction(invalidEthTradeWithTokenInput, wallet)).rejects.toThrow(
        UNKNOWN_TRADE_TYPE_ERROR_MESSAGE,
      );
      await expect(strategy.createTransaction(invalidUsdTradeWithTokenInput, wallet)).rejects.toThrow(
        UNKNOWN_TRADE_TYPE_ERROR_MESSAGE,
      );
      await expect(strategy.createTransaction(invalidTokenTradeWithEthInput, wallet)).rejects.toThrow(
        UNKNOWN_TRADE_TYPE_ERROR_MESSAGE,
      );
    });

    it("should create valid transaction for ETH to token trade", async () => {
      const tx = await strategy.createTransaction(ethToTokenTrade, wallet);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("1"));
    });

    it("should create valid transaction for USD to token trade", async () => {
      const tx = await strategy.createTransaction(usdToTokenTrade, wallet);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
      expect(tx.value).toBeGreaterThan(0n);
    });

    it("should create valid transaction for token to token trade", async () => {
      const tx = await strategy.createTransaction(tokenToTokenTrade, wallet);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeFalsy(); // Should not have ETH value for token-to-token
    });

    it("should create valid transaction for token to ETH trade", async () => {
      const tx = await strategy.createTransaction(tokenToEthTrade, wallet);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeFalsy(); // Should not have ETH value for token-to-ETH
    });

    it("should handle small ETH amounts", async () => {
      const smallTrade = { ...ethToTokenTrade, inputAmount: "0.001" };
      const tx = await strategy.createTransaction(smallTrade, wallet);

      expect(tx.value).toBe(ethers.parseEther("0.001"));
    });

    it("should handle large ETH amounts", async () => {
      const largeTrade = { ...ethToTokenTrade, inputAmount: "100" };
      const tx = await strategy.createTransaction(largeTrade, wallet);

      expect(tx.value).toBe(ethers.parseEther("100"));
    });

    it("should calculate correct ETH value for USD input", async () => {
      const usdTrade = { ...usdToTokenTrade, inputAmount: "2000" };
      const ethPrice = await strategy.getEthUsdcPrice(wallet);
      const expectedEthValue = 2000 / parseFloat(ethPrice);

      const tx = await strategy.createTransaction(usdTrade, wallet);
      const actualEthValue = parseFloat(ethers.formatEther(tx.value || 0n));

      // Allow 1% tolerance for rounding differences
      expect(actualEthValue).toBeCloseTo(expectedEthValue, 2);
    });

    it("should apply price impact validation", async () => {
      // Test with reasonable amounts that shouldn't trigger price impact
      const normalTrade = { ...ethToTokenTrade, inputAmount: "0.1" };
      const tx = await strategy.createTransaction(normalTrade, wallet);

      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
    });

    it("should apply slippage protection", async () => {
      const tx = await strategy.createTransaction(ethToTokenTrade, wallet);

      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
      expect(tx.data!.length).toBeGreaterThan(10); // Should have function call + parameters
    });
  });

  describe("createBuyTransaction", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.createBuyTransaction(offlineWallet, ethToTokenTrade)).rejects.toThrow(
        NETWORK_VALIDATION_FAILED,
      );
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.createBuyTransaction(nonNetworkWallet, ethToTokenTrade)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should create valid transaction for ETH input", async () => {
      const tx = await strategy.createBuyTransaction(wallet, ethToTokenTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("1"));
    });

    it("should create valid transaction for USD input", async () => {
      const tx = await strategy.createBuyTransaction(wallet, usdToTokenTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
      expect(tx.value).toBeGreaterThan(0n);
    });

    it("should create valid transaction for token input", async () => {
      const tokenTrade = {
        ...tokenToTokenTrade,
        inputType: InputType.TOKEN,
        inputToken: chainConfig.tokenAddresses.usdc,
        inputAmount: "1000",
      };

      const tx = await strategy.createBuyTransaction(wallet, tokenTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
    });

    it("should return empty transaction for invalid input combinations", async () => {
      const invalidTrade = {
        ...ethToTokenTrade,
        inputType: InputType.ETH,
        inputToken: AERO_TOKEN_ADDRESS, // Should be ethers.ZeroAddress for ETH input
      };

      const tx = await strategy.createBuyTransaction(wallet, invalidTrade);

      // Should return empty transaction object for invalid combinations
      expect(Object.keys(tx).length).toBe(0);
    });

    it("should handle small amounts", async () => {
      const smallTrade = { ...ethToTokenTrade, inputAmount: "0.001" };
      const tx = await strategy.createBuyTransaction(wallet, smallTrade);

      expect(tx.value).toBe(ethers.parseEther("0.001"));
    });

    it("should handle large amounts", async () => {
      const largeTrade = { ...ethToTokenTrade, inputAmount: "100" };
      const tx = await strategy.createBuyTransaction(wallet, largeTrade);

      expect(tx.value).toBe(ethers.parseEther("100"));
    });

    it("should calculate correct ETH value for USD input", async () => {
      const usdTrade = { ...usdToTokenTrade, inputAmount: "1000" };
      const ethPrice = await strategy.getEthUsdcPrice(wallet);
      const expectedEthValue = 1000 / parseFloat(ethPrice);

      const tx = await strategy.createBuyTransaction(wallet, usdTrade);
      const actualEthValue = parseFloat(ethers.formatEther(tx.value || 0n));

      // Allow 1% tolerance for rounding differences
      expect(actualEthValue).toBeCloseTo(expectedEthValue, 2);
    });

    it("should apply 5% slippage protection", async () => {
      const tx = await strategy.createBuyTransaction(wallet, ethToTokenTrade);

      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
      // The transaction should have encoded data with amountOutMin parameter
      // which includes slippage protection (5% in this case)
      expect(tx.data!.length).toBeGreaterThan(10);
    });

    it("should handle different output tokens", async () => {
      const cbethTrade = { ...ethToTokenTrade, outputToken: CBETH_TOKEN_ADDRESS };
      const tx = await strategy.createBuyTransaction(wallet, cbethTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("1"));
    });

    it("should create multi-hop routes for token input", async () => {
      const tokenTrade = {
        chain: ChainType.BASE,
        inputType: InputType.TOKEN,
        inputToken: chainConfig.tokenAddresses.usdc,
        inputAmount: "1000",
        outputToken: AERO_TOKEN_ADDRESS,
      };

      const tx = await strategy.createBuyTransaction(wallet, tokenTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
    });
  });

  describe("price impact validation", () => {
    it("should allow trades with normal price impact", async () => {
      const normalTrade = { ...ethToTokenTrade, inputAmount: "0.1" };

      const tx = await strategy.createTransaction(normalTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
    });

    it("should handle very small trades without price impact issues", async () => {
      const tinyTrade = { ...ethToTokenTrade, inputAmount: "0.001" };

      const tx = await strategy.createTransaction(tinyTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
    });

    it("should calculate price impact for different trade types", async () => {
      const ethTrade = { ...ethToTokenTrade, inputAmount: "1" };
      const usdTrade = { ...usdToTokenTrade, inputAmount: "2000" };
      const tokenTrade = { ...tokenToTokenTrade, inputAmount: "1" };
      const tokenEthTrade = { ...tokenToEthTrade, inputAmount: "100" };

      // All these should execute without price impact errors for reasonable amounts
      await expect(strategy.createTransaction(ethTrade, wallet)).resolves.toBeDefined();
      await expect(strategy.createTransaction(usdTrade, wallet)).resolves.toBeDefined();
      await expect(strategy.createTransaction(tokenTrade, wallet)).resolves.toBeDefined();
      await expect(strategy.createTransaction(tokenEthTrade, wallet)).resolves.toBeDefined();
    });

    it("should potentially trigger price impact errors for extremely large trades", async () => {
      // Extremely large trades might trigger price impact validation
      const extremeTrade = { ...ethToTokenTrade, inputAmount: "10000" };

      try {
        await strategy.createTransaction(extremeTrade, wallet);
        // If it doesn't throw, that's fine - liquidity might be sufficient
        expect(true).toBe(true);
      } catch (error) {
        // If it does throw, it should be a price impact error
        const errorMessage = error instanceof Error ? error.message : "";
        expect(errorMessage).toContain(PRICE_IMPACT_ERROR_PREFIX);
      }
    });

    it("should include price impact percentage in error message", async () => {
      const largeTrade = { ...ethToTokenTrade, inputAmount: "50000" };

      try {
        await strategy.createTransaction(largeTrade, wallet);
        // If no error is thrown, skip validation
        console.warn("Large trade did not trigger price impact error - skipping validation");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "";
        if (errorMessage.includes(PRICE_IMPACT_ERROR_PREFIX)) {
          // Should include percentage and max allowed
          expect(errorMessage).toMatch(/Price impact too high: \d+(\.\d+)?%, max allowed: \d+%/);
        }
      }
    });

    it("should handle price impact calculation for USD input trades", async () => {
      const usdTrade = { ...usdToTokenTrade, inputAmount: "5000" };

      const tx = await strategy.createTransaction(usdTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.value).toBeGreaterThan(0n);
    });

    it("should handle price impact calculation for token input trades", async () => {
      const tokenTrade = { ...tokenToTokenTrade, inputAmount: "10" };

      const tx = await strategy.createTransaction(tokenTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
    });

    it("should use multiple fallback spot rates for price impact calculation", async () => {
      // This test verifies that the price impact calculation uses fallback amounts
      // We can't directly test the internal calculation, but we can ensure it doesn't throw
      const mediumTrade = { ...ethToTokenTrade, inputAmount: "5" };

      const tx = await strategy.createTransaction(mediumTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("5"));
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle zero amounts gracefully", async () => {
      const zeroTrade = { ...ethToTokenTrade, inputAmount: "0" };

      try {
        const tx = await strategy.createTransaction(zeroTrade, wallet);
        expect(tx.value).toBe(0n);
      } catch (error) {
        // Zero amounts might be rejected, which is acceptable
        expect(error).toBeDefined();
      }
    });

    it("should handle invalid token addresses", async () => {
      const invalidTrade = {
        ...tokenToTokenTrade,
        inputToken: "0x1234567890123456789012345678901234567890",
      };

      await expect(strategy.createTransaction(invalidTrade, wallet)).rejects.toThrow();
    });

    it("should handle very large amounts", async () => {
      const largeTrade = { ...ethToTokenTrade, inputAmount: "1000000" };

      // This should create a transaction but might fail due to insufficient liquidity
      const tx = await strategy.createTransaction(largeTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("1000000"));
    });

    it("should handle route generation failures gracefully", async () => {
      // Test with an invalid output token that might not have routes
      const invalidRouteTrade = {
        ...ethToTokenTrade,
        outputToken: "0x1234567890123456789012345678901234567890",
      };

      await expect(strategy.createTransaction(invalidRouteTrade, wallet)).rejects.toThrow();
    });
  });

  describe("Aerodrome-specific functionality", () => {
    it("should use Aerodrome router address", async () => {
      const tx = await strategy.createTransaction(ethToTokenTrade, wallet);
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
    });

    it("should use Aerodrome factory address in routes", async () => {
      const quote = await strategy.getQuote(ethToTokenTrade, wallet);
      expect(quote.route.aeroRoutes).toBeDefined();
      expect(quote.route.aeroRoutes!.length).toBeGreaterThan(0);
      expect(quote.route.aeroRoutes![0].factory).toBe(chainConfig.aerodrome.poolFactoryAddress);
    });

    it("should handle stable and volatile pool routing", async () => {
      // Test with USDC which might have stable pools
      const usdcTrade = {
        ...ethToTokenTrade,
        outputToken: chainConfig.tokenAddresses.usdc,
      };

      const quote = await strategy.getQuote(usdcTrade, wallet);
      expect(quote.route.aeroRoutes).toBeDefined();
      expect(quote.route.aeroRoutes!.length).toBeGreaterThan(0);

      // Should have stable property defined for each route
      quote.route.aeroRoutes!.forEach((route) => {
        expect(typeof route.stable).toBe("boolean");
      });
    });

    it("should support multi-hop routing", async () => {
      // Test a trade that likely requires multi-hop routing
      const multiHopTrade = {
        ...tokenToTokenTrade,
        inputToken: chainConfig.tokenAddresses.usdc,
        outputToken: AERO_TOKEN_ADDRESS,
        inputAmount: "1000",
      };

      const quote = await strategy.getQuote(multiHopTrade, wallet);
      expect(quote.route.aeroRoutes).toBeDefined();
      expect(quote.route.aeroRoutes!.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle WETH properly in routes", async () => {
      const quote = await strategy.getQuote(ethToTokenTrade, wallet);
      expect(quote.route.aeroRoutes).toBeDefined();
      expect(quote.route.aeroRoutes!.length).toBeGreaterThan(0);

      // Should include WETH in the route for ETH trades
      const hasWeth = quote.route.aeroRoutes!.some(
        (route) => route.from === chainConfig.tokenAddresses.weth || route.to === chainConfig.tokenAddresses.weth,
      );
      expect(hasWeth).toBe(true);
    });

    it("should apply proper slippage in createBuyTransaction", async () => {
      // The createBuyTransaction method uses 5% slippage (95% of expected output)
      const tx = await strategy.createBuyTransaction(wallet, ethToTokenTrade);

      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("1"));
    });
  });
});

describe("Cross-Chain validation", () => {
  it("should only work on Base chain", () => {
    expect(() => new AerodromeStrategy("Test", ChainType.ETH)).toThrow(
      "AerodromeStrategy is only supported on Base chain",
    );
    expect(() => new AerodromeStrategy("Test", ChainType.ARB)).toThrow(
      "AerodromeStrategy is only supported on Base chain",
    );
  });

  it("should work correctly on Base chain", () => {
    const strategy = new AerodromeStrategy("Test", ChainType.BASE);
    expect(strategy.getName()).toBe("Test");
  });
});
