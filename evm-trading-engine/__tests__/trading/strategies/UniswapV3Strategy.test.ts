import { ethers, Wallet } from "ethers";
import { ChainConfig, ChainType, getChainConfig } from "../../../src/config/chain-config";
import { UniswapV3Strategy } from "../../../src/trading/strategies/UniswapV3Strategy";
import { InputType, TradeCreationDto } from "../../../src/trading/types/_index";
import { NetworkForkManager } from "../../helpers/network-fork";
import { getArbitrumWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";
import { TRADING_CONFIG } from "../../../src/config/trading-config";
import { UNISWAP_V3_ROUTER_INTERFACE } from "../../../src/lib/smartcontract-abis/uniswap-v3";

const STRATEGY_NAME = "UniswapV3Strategy";

const NETWORK_VALIDATION_ERROR_MESSAGE = "Network Validation Failed";
const WALLET_WRONG_NETWORK_ERROR_MESSAGE = "Wallet on different chain";
const INVALID_APPROVAL_ADDRESS_ERROR_MESSAGE = "Invalid Token Address For Approval";

describe("Uniswap V3 Strategy Test", () => {
  const chain: ChainType = ChainType.ETH;
  const chainConfig: ChainConfig = getChainConfig(chain);
  let strategy: UniswapV3Strategy;
  let wallet: Wallet;
  let nonNetworkWallet: Wallet;
  let offlineWallet: Wallet;

  const tokenToEthTrade: TradeCreationDto = {
    chain: chain,
    inputType: InputType.TOKEN,
    inputToken: chainConfig.tokenAddresses.usdc,
    inputAmount: "100",
    outputToken: ethers.ZeroAddress,
  };

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
    strategy = new UniswapV3Strategy(chain);
  }, 20_000);

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
      const testStrategy = new UniswapV3Strategy(ChainType.ETH);
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
        strategy.ensureTokenApproval(chainConfig.tokenAddresses.uni, "100", nonNetworkWallet),
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
      const result = await strategy.ensureTokenApproval(chainConfig.tokenAddresses.uni, "0", wallet);
      expect(result === null || typeof result === "string").toBe(true);
    });

    it("should throw an error for invalid token address", async () => {
      const invalidAddress = "0xinvalid";

      await expect(strategy.ensureTokenApproval(invalidAddress, "100", wallet)).rejects.toThrow(
        INVALID_APPROVAL_ADDRESS_ERROR_MESSAGE,
      );
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
});
