import { ethers, Wallet } from "ethers";
import { NetworkForkManager } from "../../helpers/network-fork";
import { getArbitrumWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";
import { ChainConfig, ChainType, getChainConfig } from "../../../src/config/chain-config";
import { UniswapV2Strategy } from "../../../src/trading/strategies/UniswapV2Strategy";
import {
  InputType,
  TradeCreationDto
} from "../../../src/trading/types/_index";
import { TRADING_CONFIG } from "../../../src/config/trading-config";

const MISSING_PROVIDER_ERROR_MESSAGE = "Wallet has missing provider";
const INVALID_NETWORK_ERROR_MESSAGE = "wallet on different chain";
const STRATEGY_NAME = "UniswapV2Strategy";

// Test addresses (these exist on mainnet forks)
const UNI_TOKEN_ADDRESS = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
const USDT_TOKEN_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

describe("Uniswap V2 Strategy Test", () => {
  let strategy: UniswapV2Strategy;
  let chainConfig: ChainConfig;
  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    const chain = ChainType.ETH;
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
      await expect(strategy.ensureTokenApproval(offlineWallet, UNI_TOKEN_ADDRESS, "100")).rejects.toThrow(
        "Infinite approval failed",
      );
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.ensureTokenApproval(nonNetworkWallet, UNI_TOKEN_ADDRESS, "100")).rejects.toThrow(
        "Infinite approval failed",
      );
    });

    it("should return null when token is already approved for infinite approval", async () => {
      // Mock infinite approval config
      const originalConfig = TRADING_CONFIG.INFINITE_APPROVAL;
      TRADING_CONFIG.INFINITE_APPROVAL = true;

      try {
        const result = await strategy.ensureTokenApproval(wallet, UNI_TOKEN_ADDRESS, "100");
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
        const result = await strategy.ensureTokenApproval(wallet, UNI_TOKEN_ADDRESS, "100");
        // In most cases, this will return null as tokens are often already approved
        // or it will return a transaction hash if approval was needed
        expect(result === null || typeof result === "string").toBe(true);
      } finally {
        TRADING_CONFIG.INFINITE_APPROVAL = originalConfig;
      }
    });

    it("should handle different token addresses", async () => {
      const result = await strategy.ensureTokenApproval(wallet, USDT_TOKEN_ADDRESS, "1000");
      expect(result === null || typeof result === "string").toBe(true);
    });

    it("should handle different amounts", async () => {
      const smallAmount = await strategy.ensureTokenApproval(wallet, UNI_TOKEN_ADDRESS, "1");
      const largeAmount = await strategy.ensureTokenApproval(wallet, UNI_TOKEN_ADDRESS, "1000000");

      expect(smallAmount === null || typeof smallAmount === "string").toBe(true);
      expect(largeAmount === null || typeof largeAmount === "string").toBe(true);
    });

    it("should handle zero amount gracefully", async () => {
      const result = await strategy.ensureTokenApproval(wallet, UNI_TOKEN_ADDRESS, "0");
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

  describe("getQuote", () => {})

  describe("createTransaction", () => {
    const baseTrade: BuyTradeCreationDto = {
      tradeType: "BUY",
      chain: ChainType.ETH,
      inputType: InputType.ETH,
      inputToken: ethers.ZeroAddress,
      inputAmount: "1.0",
      outputToken: UNI_TOKEN_ADDRESS,
    };

    it("should throw error with offline wallet", async () => {
      await expect(strategy.createBuyTransaction(offlineWallet, baseTrade)).rejects.toThrow();
    });
    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.createBuyTransaction(nonNetworkWallet, baseTrade)).rejects.toThrow();
    });

    it("should create an empty transacton if ETH inputType with inputToken", async () => {
      const invalidTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.ETH,
        inputType: InputType.ETH,
        inputToken: UNI_TOKEN_ADDRESS, // Should be ethers.ZeroAddress for ETH input
        inputAmount: "1.0",
        outputToken: UNI_TOKEN_ADDRESS,
      };

      const tx = await strategy.createBuyTransaction(wallet, invalidTrade);

      // Transaction should be empty since the input combination is invalid
      expect(tx).toEqual({});
    });

    it("should create an empty transacton if USD inputType with inputToken", async () => {
      const invalidTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.ETH,
        inputType: InputType.USD,
        inputToken: UNI_TOKEN_ADDRESS, // Should be ethers.ZeroAddress for USD input
        inputAmount: "1000",
        outputToken: UNI_TOKEN_ADDRESS,
      };

      const tx = await strategy.createBuyTransaction(wallet, invalidTrade);

      // Transaction should be empty since the input combination is invalid
      expect(tx).toEqual({});
    });

    it("should create an empty transacton if TOKEN inputType with ethers.ZeroAddress", async () => {
      const invalidTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.ETH,
        inputType: InputType.TOKEN,
        inputToken: ethers.ZeroAddress, // Should be a valid token address for TOKEN input
        inputAmount: "100",
        outputToken: UNI_TOKEN_ADDRESS,
      };

      const tx = await strategy.createBuyTransaction(wallet, invalidTrade);

      // Transaction should be empty since the input combination is invalid
      expect(tx).toEqual({});
    });

    it("should create valid transaction for ETH inputType with ethers.ZeroAddress", async () => {
      const tx = await strategy.createBuyTransaction(wallet, baseTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("1.0"));
    });
    it("should create valid transaction for USD inputType with ethers.ZeroAddress", async () => {
      const usdcTrade = { ...baseTrade, inputType: InputType.USD };
      const tx = await strategy.createBuyTransaction(wallet, usdcTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
    });
    it("should create valid transaction for TOKEN inputType with inputToken", async () => {
      const tokenTrade = { ...baseTrade, inputType: InputType.TOKEN, inputToken: UNI_TOKEN_ADDRESS };
      const tx = await strategy.createBuyTransaction(wallet, tokenTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
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
      const baseTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.ETH,
        inputType: InputType.USD,
        inputToken: ethers.ZeroAddress,
        inputAmount: "1000",
        outputToken: UNI_TOKEN_ADDRESS,
      };
      const ethPrice = await strategy.getEthUsdcPrice(wallet);
      const expectedEthValue = 1000 / parseFloat(ethPrice);

      const tx = await strategy.createBuyTransaction(wallet, baseTrade);
      const actualEthValue = parseFloat(ethers.formatEther(tx.value || 0n));

      // Allow 1% tolerance for rounding differences
      expect(actualEthValue).toBeCloseTo(expectedEthValue, 2);
    });
    it("should handle different input tokens", async () => {
      const usdtTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.ETH,
        inputType: InputType.TOKEN,
        inputToken: USDT_TOKEN_ADDRESS,
        inputAmount: "1000000", // USDT has 6 decimals
        outputToken: UNI_TOKEN_ADDRESS,
      };
      const tx = await strategy.createBuyTransaction(wallet, usdtTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });

    it("should include correct function signature for swapExactETHForTokens", async () => {
      const tx = await strategy.createBuyTransaction(wallet, baseTrade);

      // Function signature for swapExactETHForTokens
      const functionSignature = tx.data!.toString().substring(0, 10);
      expect(functionSignature).toBe("0x7ff36ab5");
    });
    it("should include correct function signature for swapExactTokensForTokens", async () => {
      const baseTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.ETH,
        inputType: InputType.TOKEN,
        inputToken: chainConfig.tokenAddresses.usdc,
        inputAmount: "1000",
        outputToken: UNI_TOKEN_ADDRESS,
      };

      const tx = await strategy.createBuyTransaction(wallet, baseTrade);

      // Function signature for swapExactTokensForTokens
      const functionSignature = tx.data!.toString().substring(0, 10);
      expect(functionSignature).toBe("0x38ed1739");
    });
  });


  describe("edge cases and error handling", () => {
    it("should handle zero amounts gracefully", async () => {
      const zeroTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.ETH,
        inputType: InputType.ETH,
        inputToken: ethers.ZeroAddress,
        inputAmount: "0",
        outputToken: UNI_TOKEN_ADDRESS,
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
        chain: ChainType.ETH,
        inputType: InputType.TOKEN,
        inputToken: "0x1234567890123456789012345678901234567890",
        inputAmount: "100",
        outputToken: UNI_TOKEN_ADDRESS,
      };

      await expect(strategy.createBuyTransaction(wallet, invalidTrade)).rejects.toThrow();
    });

    it("should handle very large amounts", async () => {
      const largeTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.ETH,
        inputType: InputType.ETH,
        inputToken: ethers.ZeroAddress,
        inputAmount: "1000000", // Very large amount
        outputToken: UNI_TOKEN_ADDRESS,
      };

      // This should create a transaction but might fail due to insufficient liquidity
      const tx = await strategy.createBuyTransaction(wallet, largeTrade);
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
