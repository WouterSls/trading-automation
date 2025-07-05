import { ethers, Wallet } from "ethers";
import { ChainConfig, ChainType, getChainConfig } from "../../../src/config/chain-config";
import { UniswapV3Strategy } from "../../../src/trading/strategies/UniswapV3Strategy";
import { InputType, TradeCreationDto } from "../../../src/trading/types/_index";
import { NetworkForkManager } from "../../helpers/network-fork";
import { getArbitrumWallet_1, getHardhatWallet_1, getOfflineSigner_1 } from "../../../src/hooks/useSetup";

const STRATEGY_NAME = "UniswapV3Strategy";

const NETWORK_VALIDATION_ERROR_MESSAGE = "Network Validation Failed";
const WALLET_WRONG_NETWORK_ERROR_MESSAGE = "Wallet on different chain";
const INVALID_APPROVAL_ADDRESS_ERROR_MESSAGE = "Invalid Token Address For Approval";
const UNKNOWN_TRADE_TYPE_ERROR_MESSAGE = "Unknown trade type for given TradeCreationDto";
const PRICE_IMPACT_ERROR_PREFIX = "Price impact too high";

describe("Uniswap V3 Strategy Test", () => {
  const chain: ChainType = ChainType.ETH;
  const chainConfig: ChainConfig = getChainConfig(chain);
  let strategy: UniswapV3Strategy;
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
    strategy = new UniswapV3Strategy(STRATEGY_NAME, chain);
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
      const testStrategy = new UniswapV3Strategy("TestStrategy", ChainType.ETH);
      expect(testStrategy.getName()).toBe("TestStrategy");
    });
  });

  describe("getQuote", () => {
    it("should throw error with offline wallet", async () => {
      await expect(strategy.getQuote(ethToTokenTrade, offlineWallet)).rejects.toThrow(NETWORK_VALIDATION_ERROR_MESSAGE);
    });

    it("should throw error with wrong network wallet", async () => {
      await expect(strategy.getQuote(ethToTokenTrade, nonNetworkWallet)).rejects.toThrow(
        WALLET_WRONG_NETWORK_ERROR_MESSAGE,
      );
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

      expect(parseFloat(largeQuote.outputAmount)).toBeGreaterThan(parseFloat(smallQuote.outputAmount));
    });

    it("should handle USD input by converting to ETH first", async () => {
      const usdTrade = { ...ethToTokenTrade, inputType: InputType.USD, inputAmount: "1000" };
      const quote = await strategy.getQuote(usdTrade, wallet);

      expect(quote).toBeDefined();
      expect(parseFloat(quote.outputAmount)).toBeGreaterThan(0);

      expect(quote.route.path[0]).toBe(chainConfig.tokenAddresses.weth);
    });
  });
});
