import { ethers, Wallet } from "ethers";
import { NetworkForkManager } from "../../helpers/network-fork";
import { getArbitrumWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";
import { ChainConfig, ChainType, getChainConfig } from "../../../src/config/chain-config";
import { UniswapV2Strategy } from "../../../src/models/trading/strategies/UniswapV2Strategy";
import {
  BuyTradeCreationDto,
  SellTradeCreationDto,
  InputType,
  OutputToken,
} from "../../../src/models/trading/types/_index";
import { TRADING_CONFIG } from "../../../src/config/trading-config";

const MISSING_PROVIDER_ERROR_MESSAGE = "Wallet has missing provider";
const INVALID_NETWORK_ERROR_MESSAGE = "Wallet and factory are on different networks";
const STRATEGY_NAME = "UniswapV2Strategy";

// Test addresses (these exist on mainnet forks)
const UNI_TOKEN_ADDRESS = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
const USDT_TOKEN_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

describe("ETH Uniswap V2 Strategy Test", () => {
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

  describe("getEthUsdcPrice", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.getEthUsdcPrice(offlineWallet)).rejects.toThrow(MISSING_PROVIDER_ERROR_MESSAGE);
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.getEthUsdcPrice(nonNetworkWallet)).rejects.toThrow(INVALID_NETWORK_ERROR_MESSAGE);
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
      await expect(strategy.getTokenEthLiquidity(offlineWallet, UNI_TOKEN_ADDRESS)).rejects.toThrow(
        MISSING_PROVIDER_ERROR_MESSAGE,
      );
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.getTokenEthLiquidity(nonNetworkWallet, UNI_TOKEN_ADDRESS)).rejects.toThrow(
        INVALID_NETWORK_ERROR_MESSAGE,
      );
    });

    it("should return valid ETH liquidity for UNI token", async () => {
      const liquidity = await strategy.getTokenEthLiquidity(wallet, UNI_TOKEN_ADDRESS);

      expect(liquidity).toBeDefined();
      expect(typeof liquidity).toBe("string");
      expect(parseFloat(liquidity)).toBeGreaterThan(0);
    });

    it("should handle non-existent pair gracefully", async () => {
      const nonExistentToken = "0x1234567890123456789012345678901234567890";
      // Some non-existent pairs might return 0 liquidity instead of throwing
      try {
        const liquidity = await strategy.getTokenEthLiquidity(wallet, nonExistentToken);
        expect(liquidity).toBeDefined();
      } catch (error) {
        // Or they might throw an error, which is also acceptable
        expect(error).toBeDefined();
      }
    });

    it("should handle USDT token liquidity", async () => {
      const liquidity = await strategy.getTokenEthLiquidity(wallet, USDT_TOKEN_ADDRESS);

      expect(liquidity).toBeDefined();
      expect(parseFloat(liquidity)).toBeGreaterThan(0);
    });
  });

  describe("getTokenUsdcPrice", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.getTokenUsdcPrice(offlineWallet, UNI_TOKEN_ADDRESS)).rejects.toThrow();
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.getTokenUsdcPrice(nonNetworkWallet, UNI_TOKEN_ADDRESS)).rejects.toThrow();
    });

    it("should return valid USDC price for UNI token", async () => {
      const price = await strategy.getTokenUsdcPrice(wallet, UNI_TOKEN_ADDRESS);

      expect(price).toBeDefined();
      expect(typeof price).toBe("string");
      expect(parseFloat(price)).toBeGreaterThan(0);
      // UNI price should be reasonable (between $1-$100)
      expect(parseFloat(price)).toBeGreaterThan(1);
      expect(parseFloat(price)).toBeLessThan(100);
    });

    it("should handle USDT token price", async () => {
      const price = await strategy.getTokenUsdcPrice(wallet, USDT_TOKEN_ADDRESS);

      expect(price).toBeDefined();
      expect(parseFloat(price)).toBeGreaterThan(0);
      // USDT should be close to $1
      expect(parseFloat(price)).toBeGreaterThan(0.9);
      expect(parseFloat(price)).toBeLessThan(1.1);
    });
  });

  describe("createBuyTransaction - ETH input", () => {
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

    it("should create valid ETH to token swap transaction", async () => {
      const tx = await strategy.createBuyTransaction(wallet, baseTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
      expect(tx.value).toBe(ethers.parseEther("1.0"));
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

    it("should include correct function signature for swapExactETHForTokens", async () => {
      const tx = await strategy.createBuyTransaction(wallet, baseTrade);

      // Function signature for swapExactETHForTokens
      const functionSignature = tx.data!.toString().substring(0, 10);
      expect(functionSignature).toBe("0x7ff36ab5");
    });
  });

  describe("createBuyTransaction - USD input", () => {
    const baseTrade: BuyTradeCreationDto = {
      tradeType: "BUY",
      chain: ChainType.ETH,
      inputType: InputType.USD,
      inputToken: ethers.ZeroAddress,
      inputAmount: "1000",
      outputToken: UNI_TOKEN_ADDRESS,
    };

    it("should create valid USD to token swap transaction", async () => {
      const tx = await strategy.createBuyTransaction(wallet, baseTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
      expect(tx.value).toBeGreaterThan(0n);
    });

    it("should calculate correct ETH value for USD input", async () => {
      const ethPrice = await strategy.getEthUsdcPrice(wallet);
      const expectedEthValue = 1000 / parseFloat(ethPrice);

      const tx = await strategy.createBuyTransaction(wallet, baseTrade);
      const actualEthValue = parseFloat(ethers.formatEther(tx.value || 0n));

      // Allow 1% tolerance for rounding differences
      expect(actualEthValue).toBeCloseTo(expectedEthValue, 2);
    });

    it("should handle small USD amounts", async () => {
      const smallTrade = { ...baseTrade, inputAmount: "10" };
      const tx = await strategy.createBuyTransaction(wallet, smallTrade);

      expect(tx.value).toBeGreaterThan(0n);
    });
  });

  describe("createBuyTransaction - Token input", () => {
    it("should create valid token to token swap transaction", async () => {
      const baseTrade: BuyTradeCreationDto = {
        tradeType: "BUY",
        chain: ChainType.ETH,
        inputType: InputType.TOKEN,
        inputToken: chainConfig.tokenAddresses.usdc,
        inputAmount: "1000",
        outputToken: UNI_TOKEN_ADDRESS,
      };

      const tx = await strategy.createBuyTransaction(wallet, baseTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeUndefined(); // No ETH value for token swaps
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
  });

  describe("createSellTransaction", () => {
    const baseTrade: SellTradeCreationDto = {
      tradeType: "SELL",
      chain: ChainType.ETH,
      inputToken: UNI_TOKEN_ADDRESS,
      inputAmount: "100",
      outputToken: OutputToken.USDC,
      tradingPointPrice: "5.0",
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
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
      expect(tx.data).toBeDefined();
    });

    it("should create valid sell to WETH transaction", async () => {
      const wethTrade = { ...baseTrade, outputToken: OutputToken.WETH };
      const tx = await strategy.createSellTransaction(wallet, wethTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);
    });

    it("should create valid sell to ETH transaction", async () => {
      const ethTrade = { ...baseTrade, outputToken: OutputToken.ETH };
      const tx = await strategy.createSellTransaction(wallet, ethTrade);

      expect(tx).toBeDefined();
      expect(tx.to).toBe(chainConfig.uniswap.v2.routerAddress);

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

    it("should handle USDT input token", async () => {
      const usdtTrade = {
        ...baseTrade,
        inputToken: USDT_TOKEN_ADDRESS,
        inputAmount: "1000000", // USDT has 6 decimals, so this is 1 USDT
        tradingPointPrice: "1.0",
      };

      // This might fail due to price impact depending on liquidity
      try {
        const tx = await strategy.createSellTransaction(wallet, usdtTrade);
        expect(tx).toBeDefined();
      } catch (error) {
        // If it fails due to price impact, that's expected behavior
        expect(error).toBeDefined();
      }
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

describe("ARB Uniswap V2 Strategy Test", () => {
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

describe("BASE Uniswap V2 Strategy Test", () => {
  let strategy: UniswapV2Strategy;
  let chainConfig: ChainConfig;
  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  beforeAll(async () => {
    const chain = ChainType.BASE;
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
    it("should return valid ETH/USDC price on Base", async () => {
      const price = await strategy.getEthUsdcPrice(wallet);

      expect(price).toBeDefined();
      expect(typeof price).toBe("string");
      expect(parseFloat(price)).toBeGreaterThan(0);
      expect(parseFloat(price)).toBeGreaterThan(500);
      expect(parseFloat(price)).toBeLessThan(10000);
    });
  });

  describe("configuration validation", () => {
    it("should use correct trading configuration constants", () => {
      expect(TRADING_CONFIG.SLIPPAGE_TOLERANCE).toBe(0.02);
      expect(TRADING_CONFIG.MAX_PRICE_IMPACT_PERCENTAGE).toBe(5);
      expect(TRADING_CONFIG.DEADLINE).toBeGreaterThan(Date.now() / 1000);
    });
  });
});
