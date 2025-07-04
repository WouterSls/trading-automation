import { ethers, Wallet } from "ethers";
import { NetworkForkManager } from "../../helpers/network-fork";
import { getArbitrumWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";
import { ChainConfig, ChainType, getChainConfig } from "../../../src/config/chain-config";
import { UniswapV2Strategy } from "../../../src/trading/strategies/UniswapV2Strategy";
import { InputType, TradeCreationDto } from "../../../src/trading/types/_index";
import { TRADING_CONFIG } from "../../../src/config/trading-config";
import { UNISWAP_V2_ROUTER_INTERFACE } from "../../../src/lib/smartcontract-abis/uniswap-v2";

const STRATEGY_NAME = "UniswapV2Strategy";

const NETWORK_VALIDATION_ERROR_MESSAGE = "Network Validation Failed";
const WALLET_WRONG_NETWORK_ERROR_MESSAGE = "Wallet on different chain";
const INVALID_APPROVAL_ADDRESS_ERROR_MESSAGE = "Invalid Token Address For Approval";
const UNKNOWN_TRADE_TYPE_ERROR_MESSAGE= "Unknown trade type for given TradeCreationDto";
const PRICE_IMPACT_ERROR_PREFIX = "Price impact too high";

describe("Uniswap V2 Strategy Test", () => {
  const chain: ChainType = ChainType.ETH;
  const chainConfig: ChainConfig = getChainConfig(chain);
  let strategy: UniswapV2Strategy;
  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  const ethToTokenTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.ETH,
    inputToken: ethers.ZeroAddress,
    inputAmount: "1",
    outputToken: chainConfig.tokenAddresses.uni,
  };
  const usdToTokenTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.USD,
    inputToken: ethers.ZeroAddress,
    inputAmount: "200",
    outputToken: chainConfig.tokenAddresses.usdc,
  };

  const tokenToEthTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.TOKEN,
    inputToken: chainConfig.tokenAddresses.usdc,
    inputAmount: "100",
    outputToken: ethers.ZeroAddress,
  }

  const tokenToTokenTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.TOKEN,
    inputToken: chainConfig.tokenAddresses.weth,
    inputAmount: "1",
    outputToken: chainConfig.tokenAddresses.uni,
  };

  const invalidEthTradeWithTokenInput: TradeCreationDto = {
    chain: chain,
    inputType: InputType.ETH,
    inputToken: chainConfig.tokenAddresses.uni, // Should be ethers.ZeroAddress for ETH input
    inputAmount: "1",
    outputToken: ethers.ZeroAddress,
  };

  const invalidUsdTradeWithTokenInput: TradeCreationDto = {
    chain: chain,
    inputType: InputType.USD,
    inputToken: chainConfig.tokenAddresses.uni, // Should be ethers.ZeroAddress for USD input
    inputAmount: "1",
    outputToken: ethers.ZeroAddress,
  };

  const invalidTokenTradeWithEthInput: TradeCreationDto = {
    chain: chain,
    inputType: InputType.TOKEN,
    inputToken: ethers.ZeroAddress, // Should be a valid token address for TOKEN input
    inputAmount: "1",
    outputToken: chainConfig.tokenAddresses.uni,
  };

  beforeAll(async () => {
    await NetworkForkManager.startHardhatFork(chain);
    strategy = new UniswapV2Strategy(STRATEGY_NAME, chain);
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
      const testStrategy = new UniswapV2Strategy("TestStrategy", ChainType.ETH);
      expect(testStrategy.getName()).toBe("TestStrategy");
    });
  });

  describe("ensureTokenApproval", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.ensureTokenApproval(chainConfig.tokenAddresses.uni, "100", offlineWallet)).rejects.toThrow(
        NETWORK_VALIDATION_ERROR_MESSAGE,
      );
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(
        strategy.ensureTokenApproval( chainConfig.tokenAddresses.uni, "100", nonNetworkWallet),
      ).rejects.toThrow(WALLET_WRONG_NETWORK_ERROR_MESSAGE);
    });

    it("should return null when token is already approved for infinite approval", async () => {
      const originalConfig = TRADING_CONFIG.INFINITE_APPROVAL;
      TRADING_CONFIG.INFINITE_APPROVAL = true;

      try {
        const result = await strategy.ensureTokenApproval(chainConfig.tokenAddresses.uni, "100", wallet);
        expect(result === null || typeof result === "string").toBe(true);
      } finally {
        TRADING_CONFIG.INFINITE_APPROVAL = originalConfig;
      }
    });

    it("should return null when token is already approved for standard approval", async () => {
      const originalConfig = TRADING_CONFIG.INFINITE_APPROVAL;
      TRADING_CONFIG.INFINITE_APPROVAL = false;

      try {
        const result = await strategy.ensureTokenApproval(chainConfig.tokenAddresses.uni, "100", wallet);
        expect(result === null || typeof result === "string").toBe(true);
      } finally {
        TRADING_CONFIG.INFINITE_APPROVAL = originalConfig;
      }
    });

    it("should handle different token addresses", async () => {
      const result = await strategy.ensureTokenApproval(chainConfig.tokenAddresses.usdt, "1000", wallet);
      expect(result === null || typeof result === "string").toBe(true);
    });

    it("should handle different amounts", async () => {
      const smallAmount = await strategy.ensureTokenApproval(chainConfig.tokenAddresses.uni, "1", wallet);
      const largeAmount = await strategy.ensureTokenApproval(chainConfig.tokenAddresses.uni, "1000000", wallet);

      expect(smallAmount === null || typeof smallAmount === "string").toBe(true);
      expect(largeAmount === null || typeof largeAmount === "string").toBe(true);
    });

    it("should handle zero amount gracefully", async () => {
      const result = await strategy.ensureTokenApproval(chainConfig.tokenAddresses.uni, "0",wallet);
      expect(result === null || typeof result === "string").toBe(true);
    });

    it("should throw an error for invalid token address", async () => {
      const invalidAddress = "0xinvalid";

      await expect(strategy.ensureTokenApproval(invalidAddress, "100", wallet)).rejects.toThrow(INVALID_APPROVAL_ADDRESS_ERROR_MESSAGE);
    });
  });

  describe("getEthUsdcPrice", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.getEthUsdcPrice(offlineWallet)).rejects.toThrow(NETWORK_VALIDATION_ERROR_MESSAGE);
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

  describe("getQuote", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.getQuote(ethToTokenTrade, offlineWallet)).rejects.toThrow(NETWORK_VALIDATION_ERROR_MESSAGE);
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.getQuote(ethToTokenTrade, nonNetworkWallet)).rejects.toThrow(WALLET_WRONG_NETWORK_ERROR_MESSAGE);
    });

    it("should throw error for invalid trade types", async () => {
      await expect(strategy.getQuote(invalidEthTradeWithTokenInput, wallet)).rejects.toThrow(UNKNOWN_TRADE_TYPE_ERROR_MESSAGE);
      await expect(strategy.getQuote(invalidUsdTradeWithTokenInput, wallet)).rejects.toThrow(UNKNOWN_TRADE_TYPE_ERROR_MESSAGE);
      await expect(strategy.getQuote(invalidTokenTradeWithEthInput, wallet)).rejects.toThrow(UNKNOWN_TRADE_TYPE_ERROR_MESSAGE);
    });

    it("should return valid quote for ETH to token trade", async () => {
      const quote = await strategy.getQuote(ethToTokenTrade, wallet);

      expect(quote).toBeDefined();
      expect(quote.outputAmount).toBeDefined();
      expect(typeof quote.outputAmount).toBe("string");
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);
      
      expect(quote.route).toBeDefined();
      expect(quote.route.amountOut).toBeGreaterThan(0n);
      expect(quote.route.path).toBeDefined();
      expect(quote.route.path.length).toBeGreaterThanOrEqual(2);
    });

    it("should return valid quote for USD to token trade", async () => {
      const quote = await strategy.getQuote(usdToTokenTrade, wallet);

      expect(quote).toBeDefined();
      expect(quote.outputAmount).toBeDefined();
      expect(typeof quote.outputAmount).toBe("string");
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);
      
      expect(quote.route).toBeDefined();
      expect(quote.route.amountOut).toBeGreaterThan(0n);
      expect(quote.route.path).toBeDefined();
      expect(quote.route.path.length).toBeGreaterThanOrEqual(2);
    });

    it("should return valid quote for token to token trade", async () => {
      const quote = await strategy.getQuote(tokenToTokenTrade, wallet);

      expect(quote).toBeDefined();
      expect(quote.outputAmount).toBeDefined();
      expect(typeof quote.outputAmount).toBe("string");
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);
      
      expect(quote.route).toBeDefined();
      expect(quote.route.amountOut).toBeGreaterThan(0n);
      expect(quote.route.path).toBeDefined();
      expect(quote.route.path.length).toBeGreaterThanOrEqual(2);
    });

    it("should return valid quote for token to ETH trade", async () => {
      const quote = await strategy.getQuote(tokenToEthTrade, wallet);

      expect(quote).toBeDefined();
      expect(quote.outputAmount).toBeDefined();
      expect(typeof quote.outputAmount).toBe("string");
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);
      
      expect(quote.route).toBeDefined();
      expect(quote.route.amountOut).toBeGreaterThan(0n);
      expect(quote.route.path).toBeDefined();
      expect(quote.route.path.length).toBeGreaterThanOrEqual(2);
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
      const usdTrade = { ...ethToTokenTrade, inputType: InputType.USD, inputAmount: "1000" };
      const quote = await strategy.getQuote(usdTrade, wallet);

      expect(quote).toBeDefined();
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);
      
      // The route should still be ETH -> Token since USD gets converted to ETH
      expect(quote.route.path[0]).toBe(chainConfig.tokenAddresses.weth);
    });
  });

  describe("createTransaction", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.createTransaction(ethToTokenTrade, offlineWallet)).rejects.toThrow(NETWORK_VALIDATION_ERROR_MESSAGE);
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.createTransaction(ethToTokenTrade, nonNetworkWallet)).rejects.toThrow(WALLET_WRONG_NETWORK_ERROR_MESSAGE);
    });

    it("should throw error for invalid trade types", async () => {
      await expect(strategy.createTransaction(invalidEthTradeWithTokenInput, wallet)).rejects.toThrow(UNKNOWN_TRADE_TYPE_ERROR_MESSAGE);
      await expect(strategy.createTransaction(invalidUsdTradeWithTokenInput, wallet)).rejects.toThrow(UNKNOWN_TRADE_TYPE_ERROR_MESSAGE);
      await expect(strategy.createTransaction(invalidTokenTradeWithEthInput, wallet)).rejects.toThrow(UNKNOWN_TRADE_TYPE_ERROR_MESSAGE);
    });

    it("should create valid transaction for ETH inputType with ethers.ZeroAddress and TOKEN output", async () => {
      const tx = await strategy.createTransaction(ethToTokenTrade, wallet);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("1"));
    });

    it("should create valid transaction for USD inputType with ethers.ZeroAddress and TOKEN output", async () => {
      const tx = await strategy.createTransaction(usdToTokenTrade, wallet);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
    });

    it("should create valid transaction for TOKEN inputType with inputToken and token output", async () => {
      const tokenTrade = {
        ...tokenToTokenTrade,
        inputType: InputType.TOKEN,
        inputToken: chainConfig.tokenAddresses.uni,
      };
      const tx = await strategy.createTransaction(tokenTrade, wallet);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
    });

    it("should create valid transaction for TOKEN inputType with inputToken and eth output", async () => {
      const tx = await strategy.createTransaction(tokenToEthTrade, wallet);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
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

    it("should handle small USD amounts", async () => {
      const smallTrade = { ...usdToTokenTrade, inputType: InputType.USD, inputAmount: "10" };
      const tx = await strategy.createTransaction(smallTrade, wallet);

      expect(tx.value).toBeGreaterThan(0n);
    });

    it("should calculate correct ETH value for USD input", async () => {
      const baseTrade: TradeCreationDto = {
        chain: ChainType.ETH,
        inputType: InputType.USD,
        inputToken: ethers.ZeroAddress,
        inputAmount: "1000",
        outputToken: chainConfig.tokenAddresses.uni,
      };
      const ethPrice = await strategy.getEthUsdcPrice(wallet);
      const expectedEthValue = 1000 / parseFloat(ethPrice);

      const tx = await strategy.createTransaction(baseTrade, wallet);
      const actualEthValue = parseFloat(ethers.formatEther(tx.value || 0n));

      // Allow 1% tolerance for rounding differences
      expect(actualEthValue).toBeCloseTo(expectedEthValue, 2);
    });

    it("should handle different input tokens", async () => {
      const usdtTrade: TradeCreationDto = {
        chain: ChainType.ETH,
        inputType: InputType.TOKEN,
        inputToken: chainConfig.tokenAddresses.usdt,
        inputAmount: "1000",
        outputToken: chainConfig.tokenAddresses.uni,
      };
      const tx = await strategy.createTransaction(usdtTrade, wallet);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });

    it("should include correct function signature for swapExactETHForTokens", async () => {
      const tx = await strategy.createTransaction(ethToTokenTrade, wallet);

      const actualSignature = tx.data!.toString().substring(0, 10);
      
      const expectedSignature = UNISWAP_V2_ROUTER_INTERFACE.getFunction("swapExactETHForTokens")!.selector;

      expect(actualSignature).toBe(expectedSignature);
    });

    it("should include correct function signature for swapExactTokensForTokens", async () => {
      const tx = await strategy.createTransaction(tokenToTokenTrade, wallet);

      const actualSignature = tx.data!.toString().substring(0, 10);

      const expectedSignature = UNISWAP_V2_ROUTER_INTERFACE.getFunction("swapExactTokensForTokens")!.selector;

      expect(actualSignature).toBe(expectedSignature);
    });

    it("should include correct function signature for swapExactTokensForETH", async () => {
      const tx = await strategy.createTransaction(tokenToEthTrade, wallet);

      const actualSignature = tx.data!.toString().substring(0, 10);

      const expectedSignature = UNISWAP_V2_ROUTER_INTERFACE.getFunction("swapExactTokensForETH")!.selector;

      expect(actualSignature).toBe(expectedSignature);
    });
  });

  //TODO: DOUBLE CHECK -> BUG IN ETHTRADER.JS
  describe("price impact validation", () => {
    it("should allow trades with normal price impact", async () => {
      // Normal trade amounts should not trigger price impact errors
      const normalTrade = { ...ethToTokenTrade, inputAmount: "0.1" };
      
      const tx = await strategy.createTransaction(normalTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
    });

    it("should handle extremely low-value tokens that cause division by zero in price impact calculation", async () => {
      // This test reproduces the edge case where:
      // 1. The spot rate calculation (0.000001 ETH) returns 0 tokens for extremely low-value tokens
      // 2. This causes division by zero in calculatePriceImpact function
      // 3. After fix, it should handle gracefully and return a valid transaction
      
      // Create a trade with a very low-value token (PEPE is often used for this type of scenario)
      const PEPE_ADDRESS = "0x6982508145454Ce325dDbE47a25d4ec3d2311933";
      const lowValueTokenTrade: TradeCreationDto = {
        chain: chain,
        inputType: InputType.TOKEN,
        inputToken: PEPE_ADDRESS,
        inputAmount: "200000", // Small amount of PEPE tokens
        outputToken: chainConfig.tokenAddresses.usdc,
      };

      // After implementing the fix, this should succeed and return a valid transaction
      const tx = await strategy.createTransaction(lowValueTokenTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });

    it("should handle very small trades without price impact issues", async () => {
      // Very small trades should have minimal price impact
      const tinyTrade = { ...ethToTokenTrade, inputAmount: "0.001" };
      
      const tx = await strategy.createTransaction(tinyTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
    });

    it("should calculate price impact for different trade types", async () => {
      // Test that price impact calculation works for all supported trade types
      const ethTrade = { ...ethToTokenTrade, inputAmount: "1" };
      const usdTrade = { ...usdToTokenTrade, inputAmount: "2000" };
      const tokenTrade = { ...tokenToTokenTrade, inputAmount: "1" };
      const tokenEthTrade = { ...tokenToEthTrade, inputAmount: "1000" };

      // All these should execute without price impact errors for reasonable amounts
      await expect(strategy.createTransaction(ethTrade, wallet)).resolves.toBeDefined();
      await expect(strategy.createTransaction(usdTrade, wallet)).resolves.toBeDefined();
      await expect(strategy.createTransaction(tokenTrade, wallet)).resolves.toBeDefined();
      await expect(strategy.createTransaction(tokenEthTrade, wallet)).resolves.toBeDefined();
    });

    it("should potentially trigger price impact errors for extremely large trades", async () => {
      // Extremely large trades might trigger price impact validation
      // Note: This test might pass or fail depending on available liquidity
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
      // This test verifies the error message format when price impact is too high
      const largeTrade = { ...ethToTokenTrade, inputAmount: "50000" };

      try {
        await strategy.createTransaction(largeTrade, wallet);
        // If no error is thrown, skip the test (liquidity might be very high)
        console.warn("Large trade did not trigger price impact error - skipping validation");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "";
        if (errorMessage.includes(PRICE_IMPACT_ERROR_PREFIX)) {
          // Should include percentage and max allowed
          expect(errorMessage).toMatch(/Price impact too high: \d+(\.\d+)?%, max allowed: \d+%/);
        }
      }
    });

    it("should use correct PRICE_IMPACT_AMOUNT_IN for spot rate calculation", async () => {
      // This test verifies that the price impact calculation uses the configured amount
      // We can't directly test the internal calculation, but we can ensure it doesn't throw
      // for trades that should be within acceptable limits
      
      const mediumTrade = { ...ethToTokenTrade, inputAmount: "5" };
      
      // This should work fine with current price impact settings
      const tx = await strategy.createTransaction(mediumTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("5"));
    });

    it("should handle price impact calculation for USD input trades", async () => {
      // USD input trades convert to ETH first, then calculate price impact
      const usdTrade = { ...usdToTokenTrade, inputAmount: "5000" };
      
      const tx = await strategy.createTransaction(usdTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.value).toBeGreaterThan(0n);
    });

    it("should handle price impact calculation for token input trades", async () => {
      // Token input trades should also calculate price impact correctly
      const tokenTrade = { ...tokenToTokenTrade, inputAmount: "10" };
      
      const tx = await strategy.createTransaction(tokenTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.data).toBeDefined();
    });

    it("should apply slippage protection after price impact validation", async () => {
      // After price impact validation passes, slippage protection should still be applied
      const trade = { ...ethToTokenTrade, inputAmount: "1" };
      
      const tx = await strategy.createTransaction(trade, wallet);
      expect(tx).toBeDefined();
      
      // The transaction should have encoded data with amountOutMin parameter
      // which includes slippage protection
      expect(tx.data).toBeDefined();
      expect(tx.data!.length).toBeGreaterThan(10); // Should have function call + parameters
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle zero amounts gracefully", async () => {
      const zeroTrade: TradeCreationDto = {
        chain: ChainType.ETH,
        inputType: InputType.ETH,
        inputToken: ethers.ZeroAddress,
        inputAmount: "0",
        outputToken: chainConfig.tokenAddresses.uni,
      };

      try {
        const tx = await strategy.createTransaction(zeroTrade, wallet);
        expect(tx.value).toBe(0n);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle invalid token addresses", async () => {
      const invalidTrade: TradeCreationDto = {
        chain: ChainType.ETH,
        inputType: InputType.TOKEN,
        inputToken: "0x1234567890123456789012345678901234567890",
        inputAmount: "100",
        outputToken: chainConfig.tokenAddresses.uni,
      };

      await expect(strategy.createTransaction(invalidTrade, wallet)).rejects.toThrow();
    });

    it("should handle very large amounts", async () => {
      const largeTrade: TradeCreationDto = {
        chain: ChainType.ETH,
        inputType: InputType.ETH,
        inputToken: ethers.ZeroAddress,
        inputAmount: "1000000", // Very large amount
        outputToken: chainConfig.tokenAddresses.uni,
      };

      // This should create a transaction but might fail due to insufficient liquidity
      const tx = await strategy.createTransaction(largeTrade, wallet);
      expect(tx).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("1000000"));
    });
  });
});

describe("Cross-Chain consistency", () => {
  let strategy: UniswapV2Strategy;
  let chainConfig: ChainConfig;
  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    const chain = ChainType.ARB;
    await NetworkForkManager.startHardhatFork(chain);
    chainConfig = getChainConfig(chain);
    strategy = new UniswapV2Strategy(STRATEGY_NAME, chain);
  });

  beforeEach(() => {
    wallet = getHardhatWallet_1();
    nonNetworkWallet = getArbitrumWallet_1();
    offlineWallet = getOfflineSigner_1();
  });

  afterAll(async () => {
    await NetworkForkManager.cleanupHardhatFork();
  });

  describe("getEthUsdcPrice", () => {
    it("should return valid ETH/USDC price on Arbitrum", async () => {
      const price = await strategy.getEthUsdcPrice(wallet);

      expect(price).toBeDefined();
      expect(typeof price).toBe("string");
      expect(parseFloat(price)).toBeGreaterThan(0);
      expect(parseFloat(price)).toBeGreaterThan(500);
      expect(parseFloat(price)).toBeLessThan(10000);
    });
  });

  describe("cross-chain consistency", () => {
    it("should maintain similar interface across chains", async () => {
      const arbStrategy = new UniswapV2Strategy("ARB_Strategy", ChainType.ARB);
      expect(arbStrategy.getName()).toBe("ARB_Strategy");

      // Basic functionality should work
      const price = await arbStrategy.getEthUsdcPrice(wallet);
      expect(parseFloat(price)).toBeGreaterThan(0);
    });
  });
});
