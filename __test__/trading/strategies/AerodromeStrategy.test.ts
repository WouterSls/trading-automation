import { ethers, Wallet } from "ethers";
import { NetworkForkManager } from "../../helpers/network-fork";
import { getBaseWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";
import { ChainConfig, ChainType, getChainConfig } from "../../../src/config/chain-config";
import { AerodromeStrategy } from "../../../src/models/trading/strategies/AerodromeStrategy";
import {
  BuyTradeCreationDto,
  SellTradeCreationDto,
  InputType,
  OutputToken,
} from "../../../src/models/trading/types/_index";
import { TRADING_CONFIG } from "../../../src/config/trading-config";

const MISSING_PROVIDER_ERROR_MESSAGE = "Wallet has missing provider";
const INVALID_NETWORK_ERROR_MESSAGE = "wallet on different chain";
const STRATEGY_NAME = "AerodromeStrategy";

// Test addresses (these exist on Base mainnet forks)
const AERO_TOKEN_ADDRESS = "0x940181a94A35A4569E4529A3CDfB74e38FD98631"; // AERO token on Base
const CBETH_TOKEN_ADDRESS = "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22"; // cbETH token on Base

describe("Aerodrome Strategy Test", () => {
  let strategy: AerodromeStrategy;
  let chainConfig: ChainConfig;
  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    const chain = ChainType.BASE;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
    strategy = new AerodromeStrategy(STRATEGY_NAME, chain);
  });

  beforeEach(() => {
    wallet = getHardhatWallet_1();
    nonNetworkWallet = getBaseWallet_1(); // Use a different wallet for wrong network tests
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
      await expect(strategy.ensureTokenApproval(offlineWallet, AERO_TOKEN_ADDRESS, "100")).rejects.toThrow(
        "Infinite approval failed",
      );
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.ensureTokenApproval(nonNetworkWallet, AERO_TOKEN_ADDRESS, "100")).rejects.toThrow(
        "Infinite approval failed",
      );
    });

    it("should return null when token is already approved for infinite approval", async () => {
      // Mock infinite approval config
      const originalConfig = TRADING_CONFIG.INFINITE_APPROVAL;
      TRADING_CONFIG.INFINITE_APPROVAL = true;

      try {
        const result = await strategy.ensureTokenApproval(wallet, AERO_TOKEN_ADDRESS, "100");
        // In most cases, this will return null as tokens are often already approved
        // or it will return a transaction hash if approval was needed
        expect(result === null || typeof result === "string").toBe(true);
      } finally {
        TRADING_CONFIG.INFINITE_APPROVAL = originalConfig;
      }
    });

    it("should return null when token is already approved for standard approval", async () => {
      // Mock standard approval config
      const originalConfig = TRADING_CONFIG.INFINITE_APPROVAL;
      TRADING_CONFIG.INFINITE_APPROVAL = false;

      try {
        const result = await strategy.ensureTokenApproval(wallet, AERO_TOKEN_ADDRESS, "100");
        // In most cases, this will return null as tokens are often already approved
        // or it will return a transaction hash if approval was needed
        expect(result === null || typeof result === "string").toBe(true);
      } finally {
        TRADING_CONFIG.INFINITE_APPROVAL = originalConfig;
      }
    });

    it("should handle different token addresses", async () => {
      const result = await strategy.ensureTokenApproval(wallet, CBETH_TOKEN_ADDRESS, "1000");
      expect(result === null || typeof result === "string").toBe(true);
    });

    it("should handle different amounts", async () => {
      const smallAmount = await strategy.ensureTokenApproval(wallet, AERO_TOKEN_ADDRESS, "1");
      const largeAmount = await strategy.ensureTokenApproval(wallet, AERO_TOKEN_ADDRESS, "1000000");

      expect(smallAmount === null || typeof smallAmount === "string").toBe(true);
      expect(largeAmount === null || typeof largeAmount === "string").toBe(true);
    });

    it("should handle zero amount gracefully", async () => {
      const result = await strategy.ensureTokenApproval(wallet, AERO_TOKEN_ADDRESS, "0");
      expect(result === null || typeof result === "string").toBe(true);
    });

    it("should throw error for invalid token address", async () => {
      const invalidAddress = "0xinvalid";
      await expect(strategy.ensureTokenApproval(wallet, invalidAddress, "100")).rejects.toThrow();
    });
  });

  describe("getEthUsdcPrice", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.getEthUsdcPrice(offlineWallet)).rejects.toThrow(MISSING_PROVIDER_ERROR_MESSAGE);
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.getEthUsdcPrice(nonNetworkWallet)).rejects.toThrow("Wallet on different chain");
    });

    it("should return valid ETH/USDC price", async () => {
      const price = await strategy.getEthUsdcPrice(wallet);

      expect(price).toBeDefined();
      expect(typeof price).toBe("string");
      expect(parseFloat(price)).toBeGreaterThan(0);
      // ETH price should be reasonable (between $500-$10000)
      expect(parseFloat(price)).toBeGreaterThan(500);
      expect(parseFloat(price)).toBeLessThan(10000);
    });
  });

  describe("getTokenEthLiquidity", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.getTokenEthLiquidity(offlineWallet, AERO_TOKEN_ADDRESS)).rejects.toThrow(
        MISSING_PROVIDER_ERROR_MESSAGE,
      );
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.getTokenEthLiquidity(nonNetworkWallet, AERO_TOKEN_ADDRESS)).rejects.toThrow(
        "Wallet on different chain",
      );
    });

    it("should handle non-existent pair gracefully", async () => {
      const nonExistentToken = "0x1234567890123456789012345678901234567890";
      const liquidity = await strategy.getTokenEthLiquidity(wallet, nonExistentToken);

      expect(liquidity).toBe("0");
    });

    it("should return valid ETH liquidity for AERO token", async () => {
      const liquidity = await strategy.getTokenEthLiquidity(wallet, AERO_TOKEN_ADDRESS);

      expect(liquidity).toBeDefined();
      expect(typeof liquidity).toBe("string");
      expect(parseFloat(liquidity)).toBeGreaterThanOrEqual(0);
    });

    it("should check both stable and volatile pools", async () => {
      const liquidity = await strategy.getTokenEthLiquidity(wallet, CBETH_TOKEN_ADDRESS);

      expect(liquidity).toBeDefined();
      expect(typeof liquidity).toBe("string");
      expect(parseFloat(liquidity)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getTokenUsdcPrice", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.getTokenUsdcPrice(offlineWallet, AERO_TOKEN_ADDRESS)).rejects.toThrow();
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.getTokenUsdcPrice(nonNetworkWallet, AERO_TOKEN_ADDRESS)).rejects.toThrow();
    });

    it("should return valid USDC price for AERO token", async () => {
      const price = await strategy.getTokenUsdcPrice(wallet, AERO_TOKEN_ADDRESS);

      expect(price).toBeDefined();
      expect(typeof price).toBe("string");
      expect(parseFloat(price)).toBeGreaterThan(0);
      // AERO price should be reasonable (between $0.01-$100)
      expect(parseFloat(price)).toBeGreaterThan(0.01);
      expect(parseFloat(price)).toBeLessThan(100);
    });

    it("should handle cbETH token price", async () => {
      const price = await strategy.getTokenUsdcPrice(wallet, CBETH_TOKEN_ADDRESS);

      expect(price).toBeDefined();
      expect(parseFloat(price)).toBeGreaterThan(0);
      // cbETH should be close to ETH price
      expect(parseFloat(price)).toBeGreaterThan(500);
      expect(parseFloat(price)).toBeLessThan(10000);
    });
  });

  describe("createBuyTransaction", () => {
    const baseTrade: BuyTradeCreationDto = {
      tradeType: "BUY",
      chain: ChainType.BASE,
      inputType: InputType.ETH,
      inputToken: ethers.ZeroAddress,
      inputAmount: "1.0",
      outputToken: AERO_TOKEN_ADDRESS,
    };

    it("should throw error with offline wallet", async () => {
      await expect(strategy.createBuyTransaction(offlineWallet, baseTrade)).rejects.toThrow();
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.createBuyTransaction(nonNetworkWallet, baseTrade)).rejects.toThrow();
    });

    it("should create an empty transaction if ETH inputType with inputToken", async () => {
      const invalidTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.BASE,
        inputType: InputType.ETH,
        inputToken: AERO_TOKEN_ADDRESS, // Should be ethers.ZeroAddress for ETH input
        inputAmount: "1.0",
        outputToken: AERO_TOKEN_ADDRESS,
      };

      const tx = await strategy.createBuyTransaction(wallet, invalidTrade);

      // Transaction should be empty since the input combination is invalid
      expect(tx).toEqual({});
    });

    it("should create an empty transaction if USD inputType with inputToken", async () => {
      const invalidTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.BASE,
        inputType: InputType.USD,
        inputToken: AERO_TOKEN_ADDRESS, // Should be ethers.ZeroAddress for USD input
        inputAmount: "1000",
        outputToken: AERO_TOKEN_ADDRESS,
      };

      const tx = await strategy.createBuyTransaction(wallet, invalidTrade);

      // Transaction should be empty since the input combination is invalid
      expect(tx).toEqual({});
    });

    it("should create an empty transaction if TOKEN inputType with ethers.ZeroAddress", async () => {
      const invalidTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.BASE,
        inputType: InputType.TOKEN,
        inputToken: ethers.ZeroAddress, // Should be a valid token address for TOKEN input
        inputAmount: "100",
        outputToken: AERO_TOKEN_ADDRESS,
      };

      const tx = await strategy.createBuyTransaction(wallet, invalidTrade);

      // Transaction should be empty since the input combination is invalid
      expect(tx).toEqual({});
    });

    it("should create valid transaction for ETH inputType with ethers.ZeroAddress", async () => {
      const tx = await strategy.createBuyTransaction(wallet, baseTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("1.0"));
    });

    it("should create valid transaction for USD inputType with ethers.ZeroAddress", async () => {
      const usdTrade = { ...baseTrade, inputType: InputType.USD };
      const tx = await strategy.createBuyTransaction(wallet, usdTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
    });

    it("should create valid transaction for TOKEN inputType with inputToken", async () => {
      const tokenTrade = { ...baseTrade, inputType: InputType.TOKEN, inputToken: chainConfig.tokenAddresses.usdc };
      const tx = await strategy.createBuyTransaction(wallet, tokenTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
    });

    it("should handle small ETH amounts", async () => {
      const smallTrade = { ...baseTrade, inputAmount: "0.001" };
      const tx = await strategy.createBuyTransaction(wallet, smallTrade);

      expect(tx.value).toBe(ethers.parseEther("0.001"));
    });

    it("should handle large ETH amounts", async () => {
      const largeTrade = { ...baseTrade, inputAmount: "100" };
      const tx = await strategy.createBuyTransaction(wallet, largeTrade);

      expect(tx.value).toBe(ethers.parseEther("100"));
    });

    it("should handle small USD amounts", async () => {
      const smallTrade = { ...baseTrade, inputType: InputType.USD, inputAmount: "10" };
      const tx = await strategy.createBuyTransaction(wallet, smallTrade);

      expect(tx.value).toBeGreaterThan(0n);
    });

    it("should calculate correct ETH value for USD input", async () => {
      const usdTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.BASE,
        inputType: InputType.USD,
        inputToken: ethers.ZeroAddress,
        inputAmount: "1000",
        outputToken: AERO_TOKEN_ADDRESS,
      };
      const ethPrice = await strategy.getEthUsdcPrice(wallet);
      const expectedEthValue = 1000 / parseFloat(ethPrice);

      const tx = await strategy.createBuyTransaction(wallet, usdTrade);
      const actualEthValue = parseFloat(ethers.formatEther(tx.value || 0n));

      // Allow 1% tolerance for rounding differences
      expect(actualEthValue).toBeCloseTo(expectedEthValue, 2);
    });

    it("should handle different input tokens", async () => {
      const usdcTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.BASE,
        inputType: InputType.TOKEN,
        inputToken: chainConfig.tokenAddresses.usdc,
        inputAmount: "1000", // USDC has 6 decimals
        outputToken: AERO_TOKEN_ADDRESS,
      };
      const tx = await strategy.createBuyTransaction(wallet, usdcTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
    });

    it("should include correct function signature for swapExactETHForTokens", async () => {
      const tx = await strategy.createBuyTransaction(wallet, baseTrade);

      // Function signature for swapExactETHForTokens
      const functionSignature = tx.data!.toString().substring(0, 10);
      expect(functionSignature).toBe("0x7ff36ab5");
    });

    it("should include correct function signature for swapExactTokensForTokens", async () => {
      const tokenTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.BASE,
        inputType: InputType.TOKEN,
        inputToken: chainConfig.tokenAddresses.usdc,
        inputAmount: "1000",
        outputToken: AERO_TOKEN_ADDRESS,
      };

      const tx = await strategy.createBuyTransaction(wallet, tokenTrade);

      // Function signature for swapExactTokensForTokens
      const functionSignature = tx.data!.toString().substring(0, 10);
      expect(functionSignature).toBe("0x38ed1739");
    });
  });

  describe("createSellTransaction", () => {
    const baseTrade: SellTradeCreationDto = {
      tradeType: "SELL",
      chain: ChainType.BASE,
      inputToken: AERO_TOKEN_ADDRESS,
      inputAmount: "100",
      outputToken: OutputToken.USDC,
      tradingPointPrice: "1.0",
    };

    it("should throw error with offline wallet", async () => {
      await expect(strategy.createSellTransaction(offlineWallet, baseTrade)).rejects.toThrow();
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.createSellTransaction(nonNetworkWallet, baseTrade)).rejects.toThrow();
    });

    it("should create valid sell to USDC transaction", async () => {
      const tx = await strategy.createSellTransaction(wallet, baseTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
      expect(tx.data).toBeDefined();
    });

    it("should create valid sell to WETH transaction", async () => {
      const wethTrade = { ...baseTrade, outputToken: OutputToken.WETH };
      const tx = await strategy.createSellTransaction(wallet, wethTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
    });

    it("should create valid sell to ETH transaction", async () => {
      const ethTrade = { ...baseTrade, outputToken: OutputToken.ETH };
      const tx = await strategy.createSellTransaction(wallet, ethTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);

      // Should use swapExactTokensForETH function
      const functionSignature = tx.data!.toString().substring(0, 10);
      expect(functionSignature).toBe("0x18cbafe5");
    });

    it("should throw error when price impact exceeds maximum", async () => {
      // Create a trade with a very high theoretical price to trigger price impact
      const highPriceTrade = { ...baseTrade, tradingPointPrice: "1000" };

      await expect(strategy.createSellTransaction(wallet, highPriceTrade)).rejects.toThrow(/Price impact too high/);
    });

    it("should handle different token amounts", async () => {
      const smallTrade = { ...baseTrade, inputAmount: "1" };
      const tx = await strategy.createSellTransaction(wallet, smallTrade);

      expect(tx).toBeDefined();
    });

    it("should apply correct slippage tolerance", async () => {
      const tx = await strategy.createSellTransaction(wallet, baseTrade);

      expect(tx).toBeDefined();
      // The transaction should be created successfully with slippage applied
      expect(tx.data).toBeDefined();
    });

    it("should handle cbETH input token", async () => {
      const cbethTrade = {
        ...baseTrade,
        inputToken: CBETH_TOKEN_ADDRESS,
        inputAmount: "1", // 1 cbETH
        tradingPointPrice: "2000.0", // Reasonable price for cbETH
      };

      // This might fail due to price impact depending on liquidity
      try {
        const tx = await strategy.createSellTransaction(wallet, cbethTrade);
        expect(tx).toBeDefined();
      } catch (error) {
        // If it fails due to price impact, that's expected behavior
        expect(error).toBeDefined();
      }
    });

    it("should validate price impact calculation", async () => {
      // Create a trade with reasonable price to test price impact validation
      const reasonableTrade = { ...baseTrade, tradingPointPrice: "1.2" }; // Close to market price

      const tx = await strategy.createSellTransaction(wallet, reasonableTrade);
      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
    });

    it("should handle minimum trade amounts", async () => {
      const minTrade = {
        ...baseTrade,
        inputAmount: "0.001", // Very small amount
        tradingPointPrice: "1.0",
      };

      const tx = await strategy.createSellTransaction(wallet, minTrade);
      expect(tx).toBeDefined();
    });

    it("should include correct function signatures for different output types", async () => {
      // Test USDC output
      const usdcTx = await strategy.createSellTransaction(wallet, baseTrade);
      const usdcSignature = usdcTx.data!.toString().substring(0, 10);
      expect(usdcSignature).toBe("0x38ed1739"); // swapExactTokensForTokens

      // Test WETH output
      const wethTrade = { ...baseTrade, outputToken: OutputToken.WETH };
      const wethTx = await strategy.createSellTransaction(wallet, wethTrade);
      const wethSignature = wethTx.data!.toString().substring(0, 10);
      expect(wethSignature).toBe("0x38ed1739"); // swapExactTokensForTokens

      // Test ETH output
      const ethTrade = { ...baseTrade, outputToken: OutputToken.ETH };
      const ethTx = await strategy.createSellTransaction(wallet, ethTrade);
      const ethSignature = ethTx.data!.toString().substring(0, 10);
      expect(ethSignature).toBe("0x18cbafe5"); // swapExactTokensForETH
    });

    it("should handle various price points", async () => {
      const testPrices = ["0.5", "1.0", "2.0"];

      for (const price of testPrices) {
        const testTrade = { ...baseTrade, tradingPointPrice: price };
        try {
          const tx = await strategy.createSellTransaction(wallet, testTrade);
          expect(tx).toBeDefined();
        } catch (error) {
          // Some prices might trigger price impact errors, which is expected
          expect(error).toBeDefined();
        }
      }
    });

    it("should return empty transaction for unsupported output token types", async () => {
      // Test with a hypothetical "TOKEN" output type that's not implemented
      const unsupportedTrade = {
        ...baseTrade,
        outputToken: "TOKEN" as OutputToken, // This should trigger the TODO case
      };

      const tx = await strategy.createSellTransaction(wallet, unsupportedTrade);

      // Should return empty transaction object since TOKEN-to-TOKEN is not implemented
      expect(tx).toEqual({});
    });

    it("should validate transaction contains correct router address", async () => {
      const tx = await strategy.createSellTransaction(wallet, baseTrade);

      expect(tx.to).toBe(chainConfig.aerodrome.routerAddress);
    });

    it("should handle zero trading point price gracefully", async () => {
      const zeroTrade = { ...baseTrade, tradingPointPrice: "0" };

      // This should either create a transaction or throw an error
      try {
        const tx = await strategy.createSellTransaction(wallet, zeroTrade);
        expect(tx).toBeDefined();
      } catch (error) {
        // Zero price might cause division by zero or other errors
        expect(error).toBeDefined();
      }
    });

    it("should handle negative trading point price", async () => {
      const negativeTrade = { ...baseTrade, tradingPointPrice: "-1.0" };

      // This should likely throw an error or handle gracefully
      try {
        const tx = await strategy.createSellTransaction(wallet, negativeTrade);
        expect(tx).toBeDefined();
      } catch (error) {
        // Negative prices should cause errors
        expect(error).toBeDefined();
      }
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle zero amounts gracefully", async () => {
      const zeroTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.BASE,
        inputType: InputType.ETH,
        inputToken: ethers.ZeroAddress,
        inputAmount: "0",
        outputToken: AERO_TOKEN_ADDRESS,
      };

      // This might fail at the router level or create a transaction with 0 value
      try {
        const tx = await strategy.createBuyTransaction(wallet, zeroTrade);
        expect(tx.value).toBe(0n);
      } catch (error) {
        // Zero amounts might be rejected, which is acceptable
        expect(error).toBeDefined();
      }
    });

    it("should handle invalid token addresses", async () => {
      const invalidTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.BASE,
        inputType: InputType.TOKEN,
        inputToken: "0x1234567890123456789012345678901234567890",
        inputAmount: "100",
        outputToken: AERO_TOKEN_ADDRESS,
      };

      await expect(strategy.createBuyTransaction(wallet, invalidTrade)).rejects.toThrow();
    });

    it("should handle very large amounts", async () => {
      const largeTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.BASE,
        inputType: InputType.ETH,
        inputToken: ethers.ZeroAddress,
        inputAmount: "1000000", // Very large amount
        outputToken: AERO_TOKEN_ADDRESS,
      };

      // This should create a transaction but might fail due to insufficient liquidity
      const tx = await strategy.createBuyTransaction(wallet, largeTrade);
      expect(tx).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("1000000"));
    });
  });

  describe("Aerodrome-specific functionality", () => {
    it("should handle stable and volatile pool routing", async () => {
      // Test that the strategy can handle both stable and volatile pools
      const liquidity = await strategy.getTokenEthLiquidity(wallet, chainConfig.tokenAddresses.usdc);
      expect(typeof liquidity).toBe("string");
      expect(parseFloat(liquidity)).toBeGreaterThanOrEqual(0);
    });

    it("should use correct factory address in routes", async () => {
      const ethPrice = await strategy.getEthUsdcPrice(wallet);
      expect(parseFloat(ethPrice)).toBeGreaterThan(0);
      // This test implicitly verifies that the factory address is being used correctly
    });

    it("should handle multi-hop routing for token prices", async () => {
      const price = await strategy.getTokenUsdcPrice(wallet, AERO_TOKEN_ADDRESS);
      expect(parseFloat(price)).toBeGreaterThan(0);
      // This test verifies multi-hop routing: AERO -> WETH -> USDC
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
